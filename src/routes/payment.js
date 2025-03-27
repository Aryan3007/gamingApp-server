import express from "express";
import {
  changeDepositStatus,
  changeWithdrawStatus,
  createPaymentIntent,
  depositHistory,
  depositRequest,
  getUserDepositHistory,
  getUserWithdrawlHistory,
  withdrawalHistory,
  withdrawalRequest,
} from "../controllers/payment.js";
import {
  adminOnly,
  adminOrSuperAdmin,
  isAuthenticated,
} from "../middlewares/auth.js";
import { singleImage } from "../middlewares/multer.js";

const app = express.Router();

app.use(isAuthenticated);

app.post("/create", createPaymentIntent);

app.get("/user-deposit-history", getUserDepositHistory);

app.get("/deposit-history", adminOrSuperAdmin, depositHistory);

app.post("/deposit-request", singleImage, depositRequest);

app.post("/deposit-status", adminOnly, changeDepositStatus);

app.get("/user-withdrawal-history", getUserWithdrawlHistory);

app.get("/withdrawal-history", adminOrSuperAdmin, withdrawalHistory);

app.post("/withdrawal-request", withdrawalRequest);

app.post("/withdrawal-status", adminOrSuperAdmin, changeWithdrawStatus);

export default app;
