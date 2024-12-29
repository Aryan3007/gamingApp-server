import express from "express";
import {
  addAmount,
  getAllUsers,
  getMyProfile,
  login,
  logout,
  newUser,
  userBanned,
} from "../controllers/user.js";
import { adminOnly, isAuthenticated } from "../middlewares/auth.js";

const app = express.Router();

app.post("/login", login);

app.use(isAuthenticated);

app.post("/new", adminOnly, newUser);

app.get("/me", getMyProfile);

app.get("/logout", logout);

app.get("/allusers", adminOnly, getAllUsers);

app.post("/userstatus/:id", adminOnly, userBanned);

app.put("/addamount/:id", adminOnly, addAmount);

export default app;
