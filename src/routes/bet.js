import express from "express";
import { adminOnly, isAuthenticated } from "../middlewares/auth.js";
import {
  betTransactions,
  changeBetStatus,
  getAllBets,
  getPendingBets,
  placeBet,
} from "../controllers/bet.js";

const app = express.Router();

app.use(isAuthenticated);

app.post("/place", placeBet);

app.get("/transactions", betTransactions);

app.get("/allbets", adminOnly, getAllBets);

app.get("/pendingbets", adminOnly, getPendingBets);

app.post("/change-status", adminOnly, changeBetStatus);

export default app;
