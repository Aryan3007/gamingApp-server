import express from "express";
import { getMyProfile, login, logout, newUser } from "../controllers/user.js";
import { isAuthenticated } from "../middlewares/auth.js";

const app = express.Router();

app.post("/new", newUser);
app.post("/login", login);

app.use(isAuthenticated);

app.get("/me", getMyProfile);

app.get("/logout", logout);

export default app;
