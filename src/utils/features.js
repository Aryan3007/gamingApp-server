import mongoose from "mongoose";
import { GAME_TOKEN } from "../constants/keys.js";
import jwt from "jsonwebtoken";

const cookieOptions = {
  maxAge: 15 * 24 * 60 * 60 * 1000,
  sameSite: "none",
  httpOnly: true,
  secure: true,
};

const connectDB = (uri) => {
  mongoose
    .connect(uri, {
      dbName: "GameApp",
    })
    .then((c) => console.log(`DB connected to ${c.connection.host}`))
    .catch((e) => console.log(e));
};

const sendToken = (res, user, code, message) => {
  const key = GAME_TOKEN;
  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);

  return res.status(code).cookie(key, token, cookieOptions).json({
    success: true,
    user,
    message,
  });
};

export { connectDB, sendToken, cookieOptions };
