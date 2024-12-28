import express from "express";
import { adminOnly } from "../middlewares/auth.js";
import {
  changePaymentStatus,
  changeWithdrawStatus,
  depositStatus,
  paymentRequest,
  withdrawRequest,
  withdrawStatus,
} from "../controllers/payment.js";

const app = express.Router();

app.get("/status/deposit", depositStatus);

app.get("/status/withdraw", withdrawStatus);

app.post("/request/payment", adminOnly, paymentRequest);

app.post("/request/withdraw", withdrawRequest);

app.post("/paymentstatus", adminOnly, changePaymentStatus);

app.post("/withdrawstatus", adminOnly, changeWithdrawStatus);

export default app;
