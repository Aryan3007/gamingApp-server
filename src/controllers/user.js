import { compare } from "bcrypt";
import mongoose from "mongoose";
import { TryCatch } from "../middlewares/error.js";
import { User } from "../models/user.js";
import { sendToken } from "../utils/features.js";
import { ErrorHandler } from "../utils/utility-class.js";

const newUser = TryCatch(async (req, res, next) => {
  const { name, email, password, currency, role, gender, amount } = req.body;

  if (!name || !email || !password || !currency || !role || !gender || !amount)
    return next(new ErrorHandler("Please enter all fields", 400));

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new ErrorHandler("Invalid email format", 400));
  }

  if (password.length < 6) {
    return next(
      new ErrorHandler("Password must be at least 6 characters", 400)
    );
  }

  const validRoles = ["user", "admin"];
  if (!validRoles.includes(role.toLowerCase())) {
    return next(new ErrorHandler("Invalid role", 400));
  }

  let user = await User.findOne({ email });
  if (user)
    return next(
      new ErrorHandler("An account with this email already exists", 400)
    );

  user = await User.create({
    name,
    email,
    gender: gender.toLowerCase(),
    amount,
    password,
    currency: currency.toLowerCase(),
    role: role.toLowerCase(),
  });

  sendToken(res, user, 201, "User created successfully");
});

const login = TryCatch(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorHandler("Email and password are required", 400));
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) return next(new ErrorHandler("Invalid Username or Password", 404));

  if (user.status === "banned")
    return next(
      new ErrorHandler("Your account is banned. Please contact support.", 403)
    );

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
  const { status, role } = req.query;
  const query = {};
  if (status) query.status = status.toLowerCase();
  if (role) query.role = role.toLowerCase();

  const users = await User.find(query);

  return res.status(200).json({
    success: true,
    users,
  });
});

const addAmount = TryCatch(async (req, res, next) => {
  const id = req.params.id;
  const { amount } = req.body;

  if (!amount || isNaN(amount) || amount <= 0)
    return next(new ErrorHandler("Please enter a valid amount", 400));

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid User ID", 400));
  }

  const user = await User.findById(id);
  if (!user) return next(new ErrorHandler("User Not Found", 404));

  user.amount += amount;
  try {
    await user.save();
  } catch (err) {
    return next(new ErrorHandler("Error saving user data", 500));
  }

  return res.status(200).json({
    success: true,
    message: `${amount} Amount added successfully`,
    user,
  });
});

const changeUserStatus = TryCatch(async (req, res, next) => {
  const id = req.params.id;
  const { status } = req.body;

  if (!status) return next(new ErrorHandler("Please provide status", 400));

  const validStatuses = ["active", "banned"];
  if (!validStatuses.includes(status.toLowerCase())) {
    return next(new ErrorHandler("Invalid status value", 400));
  }

  const user = await User.findById(id);
  if (!user) return next(new ErrorHandler("Invalid ID", 400));

  if (user.role === "admin")
    return next(
      new ErrorHandler("You are not allowed to perform this operation", 400)
    );

  user.status = status.toLowerCase();
  try {
    await user.save();
  } catch (err) {
    return next(new ErrorHandler("Error saving user data", 500));
  }

  return res.status(200).json({
    success: true,
    message: `User ${status} successfully`,
    user,
  });
});

export {
  addAmount,
  getAllUsers,
  getMyProfile,
  login,
  newUser,
  changeUserStatus,
};
