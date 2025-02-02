import cookieParser from "cookie-parser";
import cors from "cors";
import { config } from "dotenv";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { corsOption } from "./constants/config.js";
import { errorMiddleware, TryCatch } from "./middlewares/error.js";
import { connectDB } from "./utils/features.js";
import axios from "axios";

import userRoute from "./routes/user.js";
import paymentRoute from "./routes/payment.js";
import { getAllMarkets } from "./utils/service.js";

config({
  path: "./.env",
});

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "";
const NODE_ENV = process.env.NODE_ENV.trim() || "PRODUCTION";
const API_BASE_URL = process.env.API_BASE_URL || "";

connectDB(MONGO_URI);

const app = express();
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    // origin: [
    //   "http://localhost:5173",
    //   "http://localhost:3000",
    //   "http://localhost:4173",
    //   "*",
    // ],
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
app.get("/api/v1/getMarkets", getAllMarkets);

app.get("/", (req, res) => {
  res.send("Server is running");
});

const sportsDataCache = {};
const sportIds = [4];

const fetchSportsData = TryCatch(async (req, res, next) => {
  let updatedData = {};

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
          result.reason.message
        );
        continue;
      }

      const events = result.value.data;
      if (!events || events.length === 0) continue;

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

    // Check if data has changed before emitting updates
    if (JSON.stringify(updatedData) !== JSON.stringify(sportsDataCache)) {
      sportsDataCache[sportIds] = updatedData;
      io.emit("sportsData", sportsDataCache);
      // console.log(sportsDataCache);
      // console.log("📡 Sports data updated and sent to clients.");
    } else {
      console.log("✅ No new updates, skipping WebSocket emit.");
    }
  } catch (error) {
    console.error("❌ Unexpected error in fetchSportsData:", error.message);
  }
});

setInterval(fetchSportsData, 5000);

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

export { NODE_ENV, API_BASE_URL };
