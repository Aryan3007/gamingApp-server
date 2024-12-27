import { compare } from "bcrypt";
import { GAME_TOKEN } from "../constants/keys.js";
import { TryCatch } from "../middlewares/error.js";
import { User } from "../models/user.js";
import { cookieOptions, sendToken } from "../utils/features.js";
import { ErrorHandler } from "../utils/utility-class.js";

const newUser = TryCatch(async (req, res, next) => {
  const { name, email, password, currency, role, gender, amount } = req.body;

  if (!name || !email || !password || !currency || !role || !gender || !amount)
    return next(new ErrorHandler("Please enter all fields", 400));

  let user = await User.findOne({ email });
  if (user) return next(new ErrorHandler("Email is already registered", 400));

  user = await User.create({
    name,
    email,
    gender,
    amount,
    password,
    currency,
    role,
  });

  sendToken(res, user, 201, "User created successfully");
});

const login = TryCatch(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) return next(new ErrorHandler("Invalid Username or Password", 404));

  const isMatch = await compare(password, user.password);

  if (!isMatch)
    return next(new ErrorHandler("Invalid Username or Password", 404));

  sendToken(res, user, 200, `Welcome Back, ${user.name}`);
});

const getMyProfile = TryCatch(async (req, res, next) => {
  const user = await User.findById(req.user);
  if (!user) return next(new ErrorHandler("User Not Found", 404));

  res.status(200).json({
    success: true,
    user,
  });
});

const getAllUsers = TryCatch(async (req, res, next) => {
  const users = await User.find();

  return res.status(200).json({
    success: true,
    users,
  });
});

const addAmount = TryCatch(async (req, res, next) => {
  const id = req.params.id;
  const { amount } = req.body;

  if (!amount) return next(new ErrorHandler("Please enter coins", 400));
  const user = await User.findById(id);
  if (!user) return next(new ErrorHandler("Invalid ID", 400));

  user.amount += amount;
  await user.save();

  return res.status(200).json({
    success: true,
    message: "Amount added successfully",
    user,
  });
});

const userBanned = TryCatch(async (req, res, next) => {
  const id = req.params.id;
  const { status } = req.body;

  const user = await User.findById(id);
  if (!user) return next(new ErrorHandler("Invalid ID", 400));
  user.banned = status;
  await user.save();

  return res.status(200).json({
    success: true,
    message: "User banned successfully",
    user,
  });
});

const logout = TryCatch(async (req, res) => {
  return res
    .status(200)
    .cookie(GAME_TOKEN, "", { ...cookieOptions, maxAge: 0 })
    .json({
      success: true,
      message: "Logged out Successfully",
    });
});

export {
  getMyProfile,
  login,
  logout,
  newUser,
  getAllUsers,
  addAmount,
  userBanned,
};
