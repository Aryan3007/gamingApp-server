import axios from "axios";
import { API_BASE_URL } from "../../src/app.js";
import { TryCatch } from "../middlewares/error.js";
import { ErrorHandler } from "./utility-class.js";
import { Bet } from "../models/bet.js";
import { User } from "../models/user.js";

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
      console.log(`No pending bets found for event Id ${eventId}`);
      return;
    }

    const matchOddsMarketIds = new Set();
    const bookmakerMarketIds = new Set();
    const fancyMarketIds = new Set();

    pendingBets.forEach((bet) => {
      if (bet.category === "match odds") matchOddsMarketIds.add(bet.marketId);
      if (bet.category === "bookmaker") bookmakerMarketIds.add(bet.marketId);
      if (bet.category === "fancy") fancyMarketIds.add(bet.marketId);
    });

    // Fetch market results in batches
    const matchOddsRes = await fetchOddsInBatches(
      `${API_BASE_URL}/RMatchOdds`,
      Array.from(matchOddsMarketIds)
    );
    const bookmakerRes = await fetchOddsInBatches(
      `${API_BASE_URL}/RBookmaker`,
      Array.from(bookmakerMarketIds)
    );
    const fancyRes = await fetchOddsInBatches(
      `${API_BASE_URL}/RFancy`,
      Array.from(fancyMarketIds)
    );

    // Filter out invalid data
    const matchOddsResults = Object.fromEntries(
      matchOddsRes.data
        .filter((m) => m.winner !== undefined && m.winner !== null)
        .map((m) => [m.marketId, m.winner])
    );
    const bookmakerResults = Object.fromEntries(
      bookmakerRes.data
        .filter((m) => m.winner !== undefined && m.winner !== null)
        .map((m) => [m.marketId, m.winner])
    );
    const fancyResults = Object.fromEntries(
      fancyRes.data
        .filter((m) => m.winner !== undefined && m.winner !== null)
        .map((m) => [m.marketId, m.winner])
    );

    // Prepare bet updates and user balance updates
    const betUpdates = [];
    const userUpdates = new Map();

    for (const bet of pendingBets) {
      let isWinningBet = false;

      if (bet.category === "match odds" && matchOddsResults[bet.marketId]) {
        isWinningBet = matchOddsResults[bet.marketId] === bet.selectionId;
      } else if (
        bet.category === "bookmaker" &&
        bookmakerResults[bet.marketId]
      ) {
        isWinningBet = bookmakerResults[bet.marketId] === bet.selectionId;
      } else if (
        bet.category === "fancy" &&
        fancyResults[bet.marketId] !== undefined
      ) {
        const winnerNumber = fancyResults[bet.marketId];
        isWinningBet =
          (bet.type === "back" && bet.fancyNumber <= winnerNumber) ||
          (bet.type === "lay" && bet.fancyNumber > winnerNumber);
      }

      // Update bet status
      betUpdates.push({
        updateOne: {
          filter: { _id: bet._id },
          update: { status: isWinningBet ? "won" : "lose" },
        },
      });

      // Update user balance
      if (isWinningBet) {
        if (!userUpdates.has(bet.userId)) userUpdates.set(bet.userId, 0);
        userUpdates.set(bet.userId, userUpdates.get(bet.userId) + bet.payout);
      }
    }

    // Bulk update bets
    if (betUpdates.length) await Bet.bulkWrite(betUpdates);

    // Bulk update user balances
    if (userUpdates.size) {
      const userBalanceUpdates = [...userUpdates].map(([userId, amount]) => ({
        updateOne: {
          filter: { _id: userId },
          update: { $inc: { balance: amount } },
        },
      }));
      await User.bulkWrite(userBalanceUpdates);
    }

    console.log(`Bets for event ${eventId} settled successfully.`);
  } catch (error) {
    console.error("Error settling bets:", error);
  }
};

export { getAllMarkets, settleBets };
