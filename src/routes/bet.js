import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { betTransactions, placeBet } from "../controllers/bet.js";

const app = express.Router();

app.use(isAuthenticated);

app.post("/place", placeBet);

app.get("/transactions", betTransactions);

export default app;
