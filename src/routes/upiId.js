import express from "express";
import { addUpiId, deleteUpiId, getUpiId } from "../controllers/upiId.js";
import { adminOnly, isAuthenticated } from "../middlewares/auth.js";

const app = express.Router();

app.use(isAuthenticated);

app
  .route("/upi")
  .get(getUpiId)
  .post(adminOnly, addUpiId)
  .delete(adminOnly, deleteUpiId);

export default app;
