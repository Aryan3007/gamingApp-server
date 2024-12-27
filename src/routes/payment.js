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

app.get("/status/wthdraw", withdrawStatus);

app.post("/payment", adminOnly, paymentRequest);

app.post("/paymentstatus", adminOnly, changePaymentStatus);

app.post("/withdrawstatus", adminOnly, changeWithdrawStatus);

app.post("/withdraw", withdrawRequest);

export default app;
