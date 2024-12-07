import cookieParser from "cookie-parser";
import cors from "cors";
import { config } from "dotenv";
import express from "express";
import { corsOption } from "./constants/config.js";
import { errorMiddleware } from "./middlewares/error.js";
import { connectDB } from "./utils/features.js";

import userRoute from "./routes/user.js";

config({
  path: "./.env",
});

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "";

connectDB(MONGO_URI);

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOption));

app.use("/api/v1/user", userRoute);

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`Server is working on port ${PORT}`);
});
