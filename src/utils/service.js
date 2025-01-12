import axios from "axios";
import { API_BASE_URL, API_TOKEN } from "../../src/app.js";
import { Odds } from "../models/historicalOdds.js";
import { TryCatch } from "../middlewares/error.js";

let liveMatches = [];
let scores = {};
let odds = {};
const marketIds = [10, 32, 83];
const apiCallTime = 10; // in seconds
const sportIds = [1, 3, 13, 18, 2, 4, 9];

const fetchAllSports = TryCatch(async (req, res, next) => {
  // https://api.b365api.com/v3/events/inplay?sport_id=3&token=211550-FilIMrGz4rRPZY
  const response = await axios.get(
    `${API_BASE_URL}/events/inplay?sport_id=3&token=${API_TOKEN}`
  );
  console.log(response.data);
});
fetchAllSports();

// const fetchScores = async () => {
//   // https://api.aiodds.com/v1/match/score/get?user=khhbdsu&secret=692ceaccd6ea4e0fb504044ad5360178&id=13277589
//   try {
//     for (const match of liveMatches) {
//       const response = await axios.get(
//         `${API_BASE_URL}/match/score/get?user=${API_USER}&secret=${API_SECRET}&id=${match.id}`
//       );
//       scores[match.id] = response.data.data;
//     }
//     // console.log("Scores:", scores);
//   } catch (error) {
//     console.error("Error fetching scores:", error.message);
//   }
// };

// const fetchOdds = async () => {
//   // https://api.aiodds.com/v1/odds/inplay/market/bookmakers?user=khhbdsu&secret=692ceaccd6ea4e0fb504044ad5360178&sport_id=5&match_id=13277589&market_id=10
//   try {
//     for (const match of liveMatches) {
//       odds[match.id] = {};

//       const marketPromises = marketIds.map(async (marketId) => {
//         const response = await axios.get(
//           `${API_BASE_URL}/odds/inplay/market/bookmakers?user=${API_USER}&secret=${API_SECRET}&sport_id=5&match_id=${match.id}&market_id=${marketId}`
//         );
//         odds[match.id][marketId] = response.data.data;

//         await Odds.create({
//           matchId: match.id,
//           marketId,
//           oddsData: response.data.data,
//         });
//       });

//       await Promise.all(marketPromises);
//     }
//     // console.log("odds:", odds);
//   } catch (error) {
//     console.error("Error fetching odds:", error.message);
//   }
// };

// const getLastTwoHistoricalOdds = async (matchId, marketId) => {
//   try {
//     const historicalOdds = await Odds.find({ matchId, marketId })
//       .sort({ createdAt: -1 })
//       .limit(2);

//     return historicalOdds.reverse();
//   } catch (error) {
//     console.error(`Error historical odds for: ${matchId}:`, error.message);
//     return [];
//   }
// };

// const latestData = TryCatch(async (req, res, next) => {
//   await fetchLiveMatches();
//   await fetchScores();
//   await fetchOdds();

//   const combinedData = await Promise.all(
//     liveMatches.map(async (match) => {
//       const historicalOdds = {};

//       for (const marketId of marketIds) {
//         historicalOdds[marketId] = await getLastTwoHistoricalOdds(
//           match.id,
//           marketId
//         );
//       }

//       return {
//         ...match,
//         score: scores[match.id] || null,
//         odds: odds[match.id] || null,
//         historicalOdds,
//       };
//     })
//   );

//   return res.status(200).json({
//     message: "Data fetched successfully",
//     combinedData,
//   });
// });

// const fetchDataPeriodically = (io) => {
//   setInterval(async () => {
//     console.log("Fetching data...");
//     try {
//       await fetchLiveMatches();
//       // console.log("Live matches fetched:", liveMatches);

//       await fetchScores();
//       // console.log("Scores fetched:", scores);

//       await fetchOdds();
//       // console.log("Odds fetched:", odds);

//       const combinedData = await Promise.all(
//         liveMatches.map(async (match) => {
//           const historicalOdds = {};

//           for (const marketId of marketIds) {
//             const lastTwoOdds = await getLastTwoHistoricalOdds(
//               match.id,
//               marketId
//             );
//             // console.log(
//             //   `Historical odds for match ${match.id}, market ${marketId}:`,
//             //   lastTwoOdds
//             // );

//             historicalOdds[marketId] = lastTwoOdds;
//           }

//           return {
//             ...match,
//             score: scores[match.id] || null,
//             odds: odds[match.id] || null,
//             historicalOdds,
//           };
//         })
//       );

//       io.emit("updateData", combinedData);
//       console.log("Combined data emitted to WebSocket:", combinedData);
//     } catch (error) {
//       console.error("Error fetching data periodically:", error.message);
//     }
//   }, apiCallTime * 1000);
// };

export { fetchDataPeriodically, latestData };
