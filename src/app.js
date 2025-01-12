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
  const sportIds = [1, 3, 13, 18, 2, 4, 9];
  const promises = sportIds.map((id) =>
    axios.get(`${API_BASE_URL}/events/inplay?sport_id=${id}&token=${API_TOKEN}`)
  );

  const responses = await Promise.allSettled(promises);

  sportsData = {};
  responses.forEach((result, index) => {
    if (result.status === "fulfilled") {
      sportsData[sportIds[index]] = result.value.data.results;
    } else {
      console.error(
        `Error fetching data for sport ID ${sportIds[index]}:`,
        result.reason.message
      );
      sportsData[sportIds[index]] = null;
    }
  });

  io.emit("sportsData", sportsData);
  // console.log("Updated sports data:", sportsData);
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
