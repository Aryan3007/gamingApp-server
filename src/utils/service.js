import axios from "axios";
import { API_BASE_URL } from "../../src/app.js";
import { TryCatch } from "../middlewares/error.js";
import { ErrorHandler } from "./utility-class.js";

const getAllMarkets = TryCatch(async (req, res, next) => {
  const { eventId } = req.query;
  if (!eventId) return next(new ErrorHandler("EventId is Required", 400));

  // Fetch bookmaker and fancy markets
  const [bookmakerRes, fancyRes] = await Promise.all([
    axios.get(`${API_BASE_URL}/GetBookMaker?eventid=${eventId}`),
    axios.get(`${API_BASE_URL}/GetFancy?eventid=${eventId}`),
  ]);

  const bookmakerData = bookmakerRes.data || [];
  const fancyData = fancyRes.data || [];

  // Fetch bookmaker odds
  const bookMakerOddsRes = await Promise.allSettled(
    bookmakerData.map((bookmaker) =>
      axios
        .get(`${API_BASE_URL}/RBookmaker?Mids=${bookmaker.market.id}`)
        .then((res) => ({ ...bookmaker, odds: res.data }))
        .catch((error) => {
          console.error(
            `❌ Error fetching odds for market Id ${bookmaker.market.id}:`,
            error.message
          );
          return { ...bookmaker, odds: [] };
        })
    )
  );

  // Fetch fancy odds
  const fancyOddsRes = await Promise.allSettled(
    fancyData.map((fancy) =>
      axios
        .get(`${API_BASE_URL}/RBookmaker?Mids=${fancy.market.id}`)
        .then((res) => ({ ...fancy, odds: res.data }))
        .catch((error) => {
          console.error(
            `❌ Error fetching odds for market Id ${fancy.market.id}:`,
            error.message
          );
          return { ...fancy, odds: [] };
        })
    )
  );

  // Extract only fulfilled responses
  const getBookmaker = bookMakerOddsRes
    .filter((res) => res.status === "fulfilled")
    .map((res) => res.value);

  const getFancy = fancyOddsRes
    .filter((res) => res.status === "fulfilled")
    .map((res) => res.value);

  return res.json({
    eventId,
    getBookmaker,
    getFancy,
  });
});

export { getAllMarkets };
