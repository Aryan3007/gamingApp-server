import express from "express";
import {
  changeWithdrawStatus,
  depositHistory,
  withdrawRequest,
  withdrawStatus,
} from "../controllers/payment.js";
import { adminOnly, isAuthenticated } from "../middlewares/auth.js";

const app = express.Router();

app.use(isAuthenticated);

app.get("/deposit-history", depositHistory);

app.get("/status/withdraw", withdrawStatus);

app.post("/request/withdraw", withdrawRequest);

app.post("/withdrawstatus", adminOnly, changeWithdrawStatus);

export default app;
