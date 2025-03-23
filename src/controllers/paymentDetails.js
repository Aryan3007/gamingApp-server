import { TryCatch } from "../middlewares/error.js";
import { BankDetails } from "../models/bankDetails.js";
import { UpiId } from "../models/upiId.js";
import { User } from "../models/user.js";
import { ErrorHandler } from "../utils/utility-class.js";

const addUpiId = TryCatch(async (req, res, next) => {
  const { upiId } = req.body;
  if (!upiId) return next(new ErrorHandler("Please enter UPI ID", 400));

  const user = await User.findById(req.user);
  if (!user) return next(new ErrorHandler("User not found", 404));

  const id = await UpiId.findOne({ upiId });
  if (id) return next(new ErrorHandler("Upi ID already exist", 400));

  const newUpiId = await UpiId.create({ userId: user._id, upiId });

  res.status(200).json({
    success: true,
    message: "UPI ID added successfully",
    upiId: newUpiId,
  });
});

const getUpiId = TryCatch(async (req, res, next) => {
  const user = await User.findById(req.user);
  if (!user) return next(new ErrorHandler("User not found", 404));

  let userId;
  if (user.role === "master") {
    userId = user._id;
  } else if (user.role === "user") {
    userId = user.parentUser;
  } else {
    return next(new ErrorHandler("Unauthorized", 403));
  }

  const upiIds = await UpiId.find({ userId });

  res.status(200).json({
    success: true,
    message: "UPI IDs retrieved successfully",
    upiIds,
  });
});

const deleteUpiId = TryCatch(async (req, res, next) => {
  const { upiId } = req.body;
  if (!upiId) return next(new ErrorHandler("Please enter UPI ID", 400));

  const user = await User.findById(req.user);
  if (!user) return next(new ErrorHandler("User not found", 404));

  const id = await UpiId.findOne({ upiId });
  if (!id) return next(new ErrorHandler("Invalid ID", 400));

  await id.deleteOne();

  res.status(200).json({
    success: true,
    message: "UPI ID deleted successfully",
  });
});

const addBankDetails = TryCatch(async (req, res, next) => {
  const { accountNumber, ifscCode, accountHolderName, bankName } = req.body;
  if (!accountNumber || !ifscCode || !accountHolderName || !bankName)
    return next(new ErrorHandler("All bank details are required", 400));

  const user = await User.findById(req.user);
  if (!user) return next(new ErrorHandler("User not found", 404));

  const existingBank = await BankDetails.findOne({ accountNumber });
  if (existingBank)
    return next(new ErrorHandler("Bank details already exist", 400));

  const newBankDetails = await BankDetails.create({
    userId: user._id,
    accountNumber,
    ifscCode,
    accountHolderName,
    bankName,
  });

  res.status(200).json({
    success: true,
    message: "Bank details added successfully",
    bankDetails: newBankDetails,
  });
});

const getBankDetails = TryCatch(async (req, res, next) => {
  const user = await User.findById(req.user);
  if (!user) return next(new ErrorHandler("User not found", 404));

  let userId;
  if (user.role === "master") {
    userId = user._id;
  } else if (user.role === "user") {
    userId = user.parentUser;
  } else {
    return next(new ErrorHandler("Unauthorized", 403));
  }

  const bankDetails = await BankDetails.find({ userId });

  res.status(200).json({
    success: true,
    message: "Bank details retrieved successfully",
    bankDetails,
  });
});

const deleteBankDetails = TryCatch(async (req, res, next) => {
  const { accountNumber } = req.body;
  if (!accountNumber)
    return next(new ErrorHandler("Please enter Account Number", 400));

  const user = await User.findById(req.user);
  if (!user) return next(new ErrorHandler("User not found", 404));

  const bankDetail = await BankDetails.findOne({ accountNumber });
  if (!bankDetail) return next(new ErrorHandler("Bank details not found", 400));

  await bankDetail.deleteOne();

  res.status(200).json({
    success: true,
    message: "Bank details deleted successfully",
  });
});

export {
  addBankDetails,
  addUpiId,
  deleteBankDetails,
  deleteUpiId,
  getBankDetails,
  getUpiId,
};
