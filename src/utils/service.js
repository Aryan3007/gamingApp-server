import axios from "axios";
import { API_BASE_URL, API_SECRET, API_USER } from "../../src/app.js";

let liveMatches = [];
let scores = {};
let odds = {};
const marketIds = [10, 32, 83];
const apiCallTime = 10; // in seconds

const fetchLiveMatches = async () => {
  // https://api.aiodds.com/v1/match/list?user=khhbdsu&secret=692ceaccd6ea4e0fb504044ad5360178&sport_id=5&status_id=3
  try {
    const response = await axios.get(
      `${API_BASE_URL}/match/list?user=${API_USER}&secret=${API_SECRET}&sport_id=5&status_id=3`
    );
    liveMatches = response.data.data.list;
    console.log(liveMatches);
  } catch (error) {
    console.error("Error fetching live matches:", error.message);
  }
};

const fetchScores = async () => {
  // https://api.aiodds.com/v1/match/score/get?user=khhbdsu&secret=692ceaccd6ea4e0fb504044ad5360178&id=13277589
  try {
    for (const match of liveMatches) {
      const response = await axios.get(
        `${API_BASE_URL}/match/score/get?user=${API_USER}&secret=${API_SECRET}&id=${match.id}`
      );
      scores[match.id] = response.data;
    }
  } catch (error) {
    console.error("Error fetching scores:", error.message);
  }
};

const fetchOdds = async () => {
  // https://api.aiodds.com/v1/odds/inplay/market/bookmakers?user=khhbdsu&secret=692ceaccd6ea4e0fb504044ad5360178&sport_id=5&match_id=13277589&market_id=10
  try {
    for (const match of liveMatches) {
      odds[match.id] = {};

      const marketPromises = marketIds.map(async (marketId) => {
        const response = await axios.get(
          `${API_BASE_URL}/odds/inplay/market/bookmakers?user=${API_USER}&secret=${API_SECRET}&sport_id=5&match_id=${match.id}&market_id=${marketId}`
        );
        odds[match.id][marketId] = response.data;
      });

      await Promise.all(marketPromises);
    }
  } catch (error) {
    console.error("Error fetching odds:", error.message);
  }
};

const fetchDataPeriodically = (io) => {
  setInterval(async () => {
    console.log("Fetching data...");
    try {
      await fetchLiveMatches(); // Fetch live matches
      await fetchScores(); // Fetch scores for the live matches
      await fetchOdds(); // Fetch odds for each match

      const combinedData = liveMatches.map((match) => ({
        ...match,
        score: scores[match.id] || null,
        odds: odds[match.id] || null,
      }));

      io.emit("updateData", combinedData);

      console.log("Data updated and emitted to WebSocket");
    } catch (error) {
      console.error("Error fetching data periodically:", error.message);
    }
  }, apiCallTime * 1000);
};

export { fetchDataPeriodically };
