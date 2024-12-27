import { GAME_TOKEN } from "../constants/keys.js";
import { User } from "../models/user.js";
import { TryCatch } from "./error.js";

const isAuthenticated = TryCatch(async (req, res, next) => {
  const token = req.cookies[GAME_TOKEN];
  if (!token)
    return next(new ErrorHandler("Please login to access this route", 401));

  const decodedData = jwt.verify(token, process.env.JWT_SECRET);

  const user = await User.findOne({ email: decodedData.email });
  if (!user)
    return next(new ErrorHandler("Not authorized, user not found", 404));

  req.user = decodedData._id;

  next();
});

const adminOnly = TryCatch(async (req, res, next) => {
  const { id } = req.query;
  if (!id) return next(new ErrorHandler("Login First!", 401));

  const user = await User.findById(id);
  if (!user) return next(new ErrorHandler("User Not Found", 404));

  if (user.role !== "admin")
    return next(new ErrorHandler("Unauthorized Access", 403));

  next();
});

export { isAuthenticated, adminOnly };
