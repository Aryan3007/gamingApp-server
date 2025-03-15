import express from "express";
import {
  addAmount,
  changeUserStatus,
  getAllUsers,
  getMyProfile,
  login,
  newUser,
} from "../controllers/user.js";
import { adminOnly, isAuthenticated } from "../middlewares/auth.js";

const app = express.Router();

app.post("/login", login);

app.use(isAuthenticated);

app.post("/new", adminOnly, newUser);

app.get("/me", getMyProfile);

app.get("/allusers", adminOnly, getAllUsers);

app.post("/userstatus/:id", adminOnly, changeUserStatus);

app.put("/addamount/:id", adminOnly, addAmount);

export default app;
