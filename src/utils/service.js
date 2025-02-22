import axios from "axios";
import { API_BASE_URL } from "../../src/app.js";
import { TryCatch } from "../middlewares/error.js";
import { Bet } from "../models/bet.js";
import { Margin } from "../models/margin.js";
import { User } from "../models/user.js";
import { ErrorHandler } from "./utility-class.js";

const chunkArray = (array, size) => {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, index) =>
    array.slice(index * size, index * size + size)
  );
};

const fetchOddsInBatches = async (baseUrl, ids) => {
  const batches = chunkArray(ids, 50);
  const responses = await Promise.all(
    batches.map((batch) =>
      axios
        .get(`${baseUrl}?Mids=${batch.join(",")}`)
        .then((res) => res.data)
        .catch(() => [])
    )
  );
  return responses.flat();
};

const getAllMarkets = TryCatch(async (req, res, next) => {
  const { eventId } = req.query;
  if (!eventId) return next(new ErrorHandler("EventId is Required", 400));

  // Fetch all events
  const eventRes = await axios.get(`${API_BASE_URL}/GetMasterbysports?sid=4`);
  const allEvents = eventRes.data || [];
  const eventDetail =
    allEvents.find((event) => event.event.id == eventId) || null;

  // Fetch bookmaker and fancy markets
  const [bookmakerRes, fancyRes] = await Promise.all([
    axios.get(`${API_BASE_URL}/GetBookMaker?eventid=${eventId}`),
    axios.get(`${API_BASE_URL}/GetFancy?eventid=${eventId}`),
  ]);

  // Take only the first 25 from each
  const bookmakerData = bookmakerRes.data || [];
  const fancyData = fancyRes.data || [];

  // Get market IDs for API request
  const bookmakerIds = bookmakerData.map((b) => b.market.id);
  const fancyIds = fancyData.map((f) => f.market.id);

  // Fetch odds
  const bookMakerOddsRes = await fetchOddsInBatches(
    `${API_BASE_URL}/RBookmaker`,
    bookmakerIds
  );
  const fancyOddsRes = await fetchOddsInBatches(
    `${API_BASE_URL}/RFancy`,
    fancyIds
  );

  // Map odds back to their respective markets
  const getBookmaker = bookmakerData.map((b) => ({
    ...b,
    odds: bookMakerOddsRes.find((odd) => odd.marketId === b.market.id) || [],
  }));

  const getFancy = fancyData.map((f) => ({
    ...f,
    odds: fancyOddsRes.find((odd) => odd.marketId === f.market.id) || [],
  }));

  const responseData = { eventId, eventDetail, getBookmaker, getFancy };

  return res.json(responseData);
});

const settleBets = async (eventId) => {
  try {
    const pendingBets = await Bet.find({ eventId, status: "pending" });
    if (pendingBets.length === 0) {
      console.log(`No pending bets found for event Id: ${eventId}`);
      return;
    }

    const matchOddsMarketIds = new Set();
    const bookmakerMarketIds = new Set();
    const fancyMarketIds = new Set();

    pendingBets.forEach(({ category, marketId }) => {
      if (category === "bookmaker") bookmakerMarketIds.add(marketId);
      if (category === "fancy") fancyMarketIds.add(marketId);
      if (category === "match odds") matchOddsMarketIds.add(marketId);
    });

    // Fetch market results in batches
    const [matchOddsRes, bookmakerRes, fancyRes] = await Promise.allSettled([
      fetchOddsInBatches(`${API_BASE_URL}/RMatchOdds`, [...matchOddsMarketIds]),
      fetchOddsInBatches(`${API_BASE_URL}/RBookmaker`, [...bookmakerMarketIds]),
      fetchOddsInBatches(`${API_BASE_URL}/RFancy`, [...fancyMarketIds]),
    ]);

    // Handle failures gracefully
    const formatResults = (res) =>
      res.status === "fulfilled" && res.value
        ? Object.fromEntries(
            res.value
              .filter((m) => m.winner !== undefined && m.winner !== null)
              .map((m) => [m.marketId, m.winner])
          )
        : {};

    const matchOddsResults = formatResults(matchOddsRes);
    const bookmakerResults = formatResults(bookmakerRes);
    const fancyResults = formatResults(fancyRes);

    const margins = await Margin.find({ eventId })
      .sort({ createdAt: -1 })
      .lean();

    const marginMap = new Map();

    // Store only the first occurrence for each (userId, marketId) pair
    for (const margin of margins) {
      const key = `${margin.userId}-${margin.marketId}`;
      if (!marginMap.has(key)) marginMap.set(key, margin);
    }

    // Prepare bet updates and user balance updates
    const betUpdates = [];
    const userUpdates = new Map();

    for (const bet of pendingBets) {
      const {
        userId,
        category,
        marketId,
        selectionId,
        type,
        fancyNumber,
        stake,
        payout,
      } = bet;
      let isWinningBet = false;
      let isMarketResultAvailable = false;

      if (category === "match odds" && matchOddsResults[marketId]) {
        const margin = marginMap.get(`${userId}-${marketId}`);
        if (!margin) {
          console.log(
            `No margin found! event: ${eventId}, market: ${marketId} user: ${userId}`
          );
          return;
        }

        const updateAmount = Math.abs(Math.min(margin.profit, margin.loss, 0));
        userUpdates.set(userId, (userUpdates.get(userId) || 0) + updateAmount);

        isWinningBet =
          (matchOddsResults.get(marketId) === selectionId && type === "back") ||
          (matchOddsResults.get(marketId) !== selectionId && type === "lay");

        isMarketResultAvailable = true;
      } else if (category === "bookmaker" && bookmakerResults[marketId]) {
        const margin = marginMap.get(`${userId}-${marketId}`);
        if (!margin) {
          console.log(
            `No margin found! event: ${eventId}, market: ${marketId} user: ${userId}`
          );
          return;
        }

        const updateAmount = Math.abs(Math.min(margin.profit, margin.loss, 0));
        userUpdates.set(userId, (userUpdates.get(userId) || 0) + updateAmount);

        isWinningBet =
          (bookmakerResults.get(marketId) === selectionId && type === "back") ||
          (bookmakerResults.get(marketId) !== selectionId && type === "lay");

        isMarketResultAvailable = true;
      } else if (category === "fancy" && fancyResults[marketId]) {
        const winnerNumber = fancyResults[bet.marketId];
        isWinningBet =
          (type === "back" && fancyNumber <= winnerNumber) ||
          (type === "lay" && fancyNumber > winnerNumber);
        isMarketResultAvailable = true;
      }

      // Skip the bet if no market result is available
      if (!isMarketResultAvailable) continue;

      // Update bet status if market result exists
      betUpdates.push({
        updateOne: {
          filter: { _id: bet._id },
          update: { status: isWinningBet ? "won" : "lost" },
        },
      });

      // Update user balance
      const balanceChange = isWinningBet ? payout - stake : -stake;
      if (category === "fancy")
        userUpdates.set(userId, (userUpdates.get(userId) || 0) + payout);
      else
        userUpdates.set(userId, (userUpdates.get(userId) || 0) + balanceChange);
    }

    // Bulk update bets
    if (betUpdates.length > 0) await Bet.bulkWrite(betUpdates);

    // Bulk update user balances
    if (userUpdates.size > 0) {
      const userBalanceUpdates = [...userUpdates].map(([userId, amount]) => ({
        updateOne: {
          filter: { _id: userId },
          update: { $inc: { amount } },
        },
      }));
      await User.bulkWrite(userBalanceUpdates);
    }

    console.log(`Bets for event Id: ${eventId} settled successfully.`);
  } catch (error) {
    console.error(`Error settling bets for event Id: ${eventId}:`, error);
  }
};

export { getAllMarkets, settleBets };

