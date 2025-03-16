import express from "express";
import {
  changeWithdrawStatus,
  depositHistory,
  withdrawalHistory,
  withdrawalRequest,
} from "../controllers/payment.js";
import { adminOrSuperAdmin, isAuthenticated } from "../middlewares/auth.js";

const app = express.Router();

app.use(isAuthenticated);

app.get("/deposit-history", depositHistory);

app.get("/withdrawal-history", withdrawalHistory);

app.post("/withdrawal-request", withdrawalRequest);

app.post("/withdrawal-status", adminOrSuperAdmin, changeWithdrawStatus);

export default app;
