import express from "express";
import {
  betTransactions,
  changeBetStatus,
  getBets,
  getFancyExposure,
  getMargins,
  getTotalExposure,
  placeBet,
} from "../controllers/bet.js";
import { adminOnly, isAuthenticated } from "../middlewares/auth.js";

const app = express.Router();

app.use(isAuthenticated);

app.post("/place", placeBet);

app.get("/transactions", betTransactions);

app.get("/margins", getMargins);

app.get("/fancy-exposure", getFancyExposure);

app.get("/total-exposure", getTotalExposure);

app.get("/bets", adminOnly, getBets);

app.post("/change-status", adminOnly, changeBetStatus);

export default app;
