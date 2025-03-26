import express from "express";
import {
  addBankDetails,
  addQRCode,
  addUpiId,
  deleteBankDetails,
  deleteQRCode,
  deleteUpiId,
  getBankDetails,
  getQRCode,
  getUpiId,
} from "../controllers/paymentDetails.js";
import { adminOnly, isAuthenticated } from "../middlewares/auth.js";

const app = express.Router();

app.use(isAuthenticated);

app
  .route("/upi")
  .get(getUpiId)
  .post(adminOnly, addUpiId)
  .delete(adminOnly, deleteUpiId);

app
  .route("/bank-details")
  .get(getBankDetails)
  .post(adminOnly, addBankDetails)
  .delete(adminOnly, deleteBankDetails);

app
  .route("/qrcode")
  .get(getQRCode)
  .post(adminOnly, addQRCode)
  .delete(adminOnly, deleteQRCode);

export default app;
