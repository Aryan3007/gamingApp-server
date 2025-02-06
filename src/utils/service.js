import axios from "axios";
import { API_BASE_URL } from "../../src/app.js";
import { TryCatch } from "../middlewares/error.js";
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

// const settleBets = async (eventId) => {
//   const [bookmakerRes, fancyRes] = await Promise.all([
//     axios.get(`${API_BASE_URL}/GetBookMaker?eventid=${eventId}`),
//     axios.get(`${API_BASE_URL}/GetFancy?eventid=${eventId}`),
//   ]);

//   // Take only the first 25 from each
//   const bookmakerData = bookmakerRes.data || [];
//   const fancyData = fancyRes.data || [];

//   // Get market IDs for API request
//   const bookmakerIds = bookmakerData.map((b) => b.market.id);
//   const fancyIds = fancyData.map((f) => f.market.id);

//   // Fetch odds
//   const bookMakerOddsRes = await fetchOddsInBatches(
//     `${API_BASE_URL}/RBookmaker`,
//     bookmakerIds
//   );
//   const fancyOddsRes = await fetchOddsInBatches(
//     `${API_BASE_URL}/RFancy`,
//     fancyIds
//   );

//   // Map odds back to their respective markets
//   const getBookmaker = bookmakerData.map((b) => ({
//     ...b,
//     odds: bookMakerOddsRes.find((odd) => odd.marketId === b.market.id) || [],
//   }));

//   const getFancy = fancyData.map((f) => ({
//     ...f,
//     odds: fancyOddsRes.find((odd) => odd.marketId === f.market.id) || [],
//   }));


// };

// async function settleBets(marketId) {
//     const marketData = await fetchMarketOdds(marketId);  // Get data from API
//     const winnerSelectionId = marketData.winner;

//     // Get all pending bets
//     const pendingBets = await Bet.find({ marketId, status: "PENDING" });

//     for (let bet of pendingBets) {
//         if (bet.selectionId == winnerSelectionId) {
//             // User won, add winnings
//             const userWallet = await Wallet.findOne({ userId: bet.userId });
//             const winnings = bet.potentialPayout;
//             userWallet.balance += winnings;
//             userWallet.transactions.push({
//                 amount: winnings,
//                 type: "WINNINGS",
//                 betId: bet._id,
//                 timestamp: new Date()
//             });
//             await userWallet.save();

//             // Update bet status
//             bet.status = "WON";
//         } else {
//             bet.status = "LOST";
//         }
//         await bet.save();
//     }
// }


export { getAllMarkets };
