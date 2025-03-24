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
import {
  adminOrSuperAdmin,
  isAuthenticated,
  superAdminOnly,
} from "../middlewares/auth.js";

const app = express.Router();

app.use(isAuthenticated);

app.post("/place", placeBet);

app.get("/transactions", betTransactions);

app.get("/margins", getMargins);

app.get("/fancy-exposure", getFancyExposure);

app.get("/total-exposure", getTotalExposure);

app.get("/bets", adminOrSuperAdmin, getBets);

app.post("/change-status", superAdminOnly, changeBetStatus);

export default app;
