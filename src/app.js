import cookieParser from "cookie-parser";
import cors from "cors";
import { config } from "dotenv";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { corsOption } from "./constants/config.js";
import { errorMiddleware, TryCatch } from "./middlewares/error.js";
import { connectDB } from "./utils/features.js";

import userRoute from "./routes/user.js";
import paymentRoute from "./routes/payment.js";
import axios from "axios";

config({
  path: "./.env",
});

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "";
const NODE_ENV = process.env.NODE_ENV.trim() || "PRODUCTION";
const API_BASE_URL = process.env.API_BASE_URL || "";
const API_TOKEN = process.env.API_TOKEN || "";

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

app.get("/", (req, res) => {
  res.send("Server is running");
});

let sportsData = {};

const fetchSportsData = TryCatch(async (req, res, next) => {
  const sportIds = [4];
  sportsData = {};

  // Fetch events for all sport IDs
  const eventPromises = sportIds.map((id) =>
    axios.get(`${API_BASE_URL}/GetMasterbysports?sid=${id}`)
  );

  const eventResponses = await Promise.allSettled(eventPromises);
  // console.log("Fetched events:", eventResponses);

  // Iterate through event responses to fetch odds
  for (const [index, result] of eventResponses.entries()) {
    const sportId = sportIds[index];
    sportsData[sportId] = [];

    if (result.status === "fulfilled") {
      const events = result.value.data;
      // console.log(events[1].market.id);

      // Fetch odds for each event
      const oddsPromises = events.map((event) =>
        axios
          .get(`${API_BASE_URL}/RMatchOdds?Mids=${event.market.id}`)
          .then((oddsResponse) => ({ event, odds: oddsResponse.data }))
          .catch((error) => {
            console.error(
              `Error fetching odds for event ID ${event.id}:`,
              error.message
            );
            return { event, odds: null };
          })
      );

      const oddsResults = await Promise.allSettled(oddsPromises);

      // Combine event data with odds
      oddsResults.forEach((oddsResult) => {
        if (oddsResult.status === "fulfilled") {
          // console.log("match: ", oddsResult.value);
          sportsData[sportId].push(oddsResult.value);
        } else {
          console.error(
            "Error combining odds and events:",
            oddsResult.reason.message
          );
        }
      });
    } else {
      console.error(
        `Error fetching data for sport ID ${sportId}:`,
        result.reason.message
      );
    }
  }

  io.emit("sportsData", sportsData);
  console.log("Updated sports data with odds:", sportsData);
});

setInterval(fetchSportsData, 5000);

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.emit("sportsData", sportsData);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

app.use(errorMiddleware);

server.listen(PORT, () => {
  console.log(`Server is working on port ${PORT} in ${NODE_ENV} mode`);
});

export { NODE_ENV };
