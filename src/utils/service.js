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

  // Fetch bookmaker and fancy markets
  const [bookmakerRes, fancyRes] = await Promise.all([
    axios.get(`${API_BASE_URL}/GetBookMaker?eventid=${eventId}`),
    axios.get(`${API_BASE_URL}/GetFancy?eventid=${eventId}`),
  ]);

  const bookmakerData = bookmakerRes.data || [];
  const fancyData = fancyRes.data || [];

  // Fetch odds
  const bookMakerOddsRes = await Promise.allSettled(
    bookmakerData.map((bookmaker) =>
      axios
        .get(`${API_BASE_URL}/RBookmaker?Mids=${bookmaker.market.id}`)
        .then((res) => ({ ...bookmaker, odds: res.data }))
        .catch(() => ({ ...bookmaker, odds: [] }))
    )
  );

  const fancyOddsRes = await Promise.allSettled(
    fancyData.map((fancy) =>
      axios
        .get(`${API_BASE_URL}/RBookmaker?Mids=${fancy.market.id}`)
        .then((res) => ({ ...fancy, odds: res.data }))
        .catch(() => ({ ...fancy, odds: [] }))
    )
  );

  const getBookmaker = bookMakerOddsRes
    .filter((res) => res.status === "fulfilled")
    .map((res) => res.value);

  const getFancy = fancyOddsRes
    .filter((res) => res.status === "fulfilled")
    .map((res) => res.value);

  const responseData = { eventId, getBookmaker, getFancy };

  // Store in cache
  cache.set(cacheKey, { data: responseData, timestamp: Date.now() });

  return res.json(responseData);
});


export { getAllMarkets };
