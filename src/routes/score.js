import express from "express";
import { cricketScore } from "../controllers/score.js";

const app = express.Router();

app.get("/cricket", cricketScore);

export default app;
