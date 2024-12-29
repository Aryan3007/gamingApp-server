import { GAME_TOKEN } from "../constants/keys.js";
import { User } from "../models/user.js";
import { ErrorHandler } from "../utils/utility-class.js";
import { TryCatch } from "./error.js";
import jwt from "jsonwebtoken";

const isAuthenticated = TryCatch(async (req, res, next) => {
  const token = req.cookies[GAME_TOKEN];
  if (!token)
    return next(new ErrorHandler("Please login to access this route", 401));

  try {
    const decodedData = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decodedData._id });
    if (!user)
      return next(new ErrorHandler("Not authorized, user not found", 404));

    if (user.status === "banned")
      return next(
        new ErrorHandler("Your account is banned. Please contact support.", 400)
      );

    req.user = decodedData._id;
    next();
  } catch (error) {
    return next(new ErrorHandler("Invalid or expired token", 401));
  }
});

const adminOnly = TryCatch(async (req, res, next) => {
  console.log(req.user);
  const user = await User.findById(req.user);
  if (!user) return next(new ErrorHandler("User Not Found", 404));

  if (user.role !== "admin")
    return next(new ErrorHandler("Unauthorized Access", 403));

  next();
});

export { isAuthenticated, adminOnly };
