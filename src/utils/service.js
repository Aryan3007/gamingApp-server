import axios from "axios";
import { API_BASE_URL } from "../../src/app.js";
import { TryCatch } from "../middlewares/error.js";
import { ErrorHandler } from "./utility-class.js";

const cache = new Map();
const CACHE_DURATION = 5 * 1000;

const getAllMarkets = TryCatch(async (req, res, next) => {
  const { eventId } = req.query;
  if (!eventId) return next(new ErrorHandler("EventId is Required", 400));

  const cacheKey = `markets_${eventId}`;
  const cachedData = cache.get(cacheKey);

  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    return res.json(cachedData.data);
  }

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
  const bookmakerData = (bookmakerRes.data || []).slice(0, 25);
  const fancyData = (fancyRes.data || []).slice(0, 25);

  // Get market IDs for API request
  const bookmakerIds = bookmakerData.map((b) => b.market.id);
  const fancyIds = fancyData.map((f) => f.market.id);

  // Fetch odds
  const bookMakerOddsRes = await axios
    .get(`${API_BASE_URL}/RBookmaker?Mids=${bookmakerIds.join(",")}`)
    .then((res) => res.data)
    .catch(() => []);

  const fancyOddsRes = await axios
    .get(`${API_BASE_URL}/RFancy?Mids=${fancyIds.join(",")}`)
    .then((res) => res.data)
    .catch(() => []);

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

  // Store in cache
  cache.set(cacheKey, { data: responseData, timestamp: Date.now() });

  return res.json(responseData);
});

export { getAllMarkets };
