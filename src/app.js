import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import cookieParser from "cookie-parser";
import cors from "cors";
import { config } from "dotenv";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { corsOption } from "./constants/config.js";
import { errorMiddleware } from "./middlewares/error.js";
import { connectDB } from "./utils/features.js";
import { getAllMarkets, settleBets } from "./utils/service.js";

import betRoute from "./routes/bet.js";
import miscRoute from "./routes/misc.js";
import paymentRoute from "./routes/payment.js";
import userRoute from "./routes/user.js";
import { getFormattedTimestamp } from "./utils/helper.js";

config({
  path: "./.env",
});

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "";
const NODE_ENV = process.env.NODE_ENV.trim() || "PRODUCTION";
const API_BASE_URL = process.env.API_BASE_URL || "";

connectDB(MONGO_URI);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    // origin: ["https://www.shaktiex.com", "http://localhost:5173"],
    origin: true,
    credentials: true,
  },
  path: "/socket.io/",
});

app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOption));

app.use("/api/v1/user", userRoute);
app.use("/api/v1/payment", paymentRoute);
app.use("/api/v1/bet", betRoute);
app.use("/api/v1/misc", miscRoute);
app.get("/api/v1/getMarkets", getAllMarkets);

app.get("/", (req, res) => {
  res.send("Server is running");
});

const sportsDataCache = {};
const sportIds = [4];
let pastEventIds = [];

const fetchSportsData = async () => {
  let updatedData = [];
  try {
    // Fetch events for all sport IDs
    const eventResponses = await Promise.allSettled(
      sportIds.map((id) =>
        axios.get(`${API_BASE_URL}/GetMasterbysports?sid=${id}`)
      )
    );

    for (const [index, result] of eventResponses.entries()) {
      const sportId = sportIds[index];
      updatedData[sportId] = [];

      if (result.status !== "fulfilled") {
        console.error(
          `❌ Error fetching data for sport ID ${sportId}:`,
          result.reason?.message
        );
        continue;
      }

      const events = result.value?.data || [];
      if (events.length === 0) continue;

      // Fetch odds for each event
      const oddsResponses = await Promise.allSettled(
        events.map((event) =>
          axios
            .get(`${API_BASE_URL}/RMatchOdds?Mids=${event.market.id}`)
            .then((oddsResponse) => ({ event, odds: oddsResponse.data }))
            .catch((error) => {
              console.error(
                `❌ Error fetching odds for event ${event.id}:`,
                error.message
              );
              return { event, odds: [] };
            })
        )
      );

      // Process and update only valid results
      oddsResponses.forEach((oddsResult) => {
        if (oddsResult.status === "fulfilled" && oddsResult.value?.odds) {
          updatedData[sportId].push(oddsResult.value);
        }
      });
    }
    sportsDataCache[sportIds] = updatedData;

    io.emit("sportsData", sportsDataCache);
    // console.log(sportsDataCache);
    // console.log("📡 Sports data updated and sent to clients.");
  } catch (error) {
    console.error("❌ Unexpected error in fetchSportsData:", error.message);
  }
};

const settlingBets = async () => {
  try {
    const startTime = Date.now();
    console.log(`⏳ [${getFormattedTimestamp()}] Starting bet settlement...`);

    console.log(`✅ Settling bets for event Ids: ${pastEventIds.join(", ")}`);

    // await settleBets(34057482);
    await Promise.all(pastEventIds.map((eventId) => settleBets(eventId)));

    const endTime = Date.now();
    console.log(
      `✅ [${getFormattedTimestamp()}] Bet settlement completed in ${
        endTime - startTime
      }ms.`
    );

    // Fetch events for all sportIds
    const eventResponses = await Promise.allSettled(
      sportIds.map((id) =>
        axios.get(`${API_BASE_URL}/GetMasterbysports?sid=${id}`)
      )
    );

    // Extract valid event IDs from responses
    const eventIds = eventResponses
      .filter((res) => res.status === "fulfilled" && res.value?.data)
      .flatMap((res) => res.value.data.map((event) => event.event.id))
      .filter((id) => id !== undefined && id !== null);

    if (eventIds.length === 0) {
      console.log("⚠️ No valid event IDs found.");
      return;
    }
    pastEventIds = eventIds;
  } catch (error) {
    console.error(
      `❌ [${getFormattedTimestamp()}] Unexpected error in settling Bets:`,
      error
    );
  }
};

setInterval(fetchSportsData, 1 * 1000);
setInterval(settlingBets, 1 * 60 * 1000);

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.emit("sportsData", sportsDataCache);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

app.use(errorMiddleware);

server.listen(PORT, () => {
  console.log(`Server is working on port ${PORT} in ${NODE_ENV} mode`);
});

export { API_BASE_URL, NODE_ENV };
