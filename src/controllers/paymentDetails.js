import { TryCatch } from "../middlewares/error.js";
import { BankDetails } from "../models/bankDetails.js";
import { UpiId } from "../models/upiId.js";
import { ErrorHandler } from "../utils/utility-class.js";

const addUpiId = TryCatch(async (req, res, next) => {
  const { upiId } = req.body;
  if (!upiId) return next(new ErrorHandler("Please enter UPI ID", 400));

  const id = await UpiId.findOne({ upiId });
  if (id) return next(new ErrorHandler("Upi ID already exist", 400));

  const newUpiId = await UpiId.create({ upiId });

  res.status(200).json({
    success: true,
    message: "UPI ID added successfully",
    upiId: newUpiId,
  });
});

const getUpiId = TryCatch(async (req, res, next) => {
  const upiIds = await UpiId.find();

  res.status(200).json({
    success: true,
    message: "UPI IDs retrieved successfully",
    upiIds,
  });
});

const deleteUpiId = TryCatch(async (req, res, next) => {
  const { upiId } = req.body;
  if (!upiId) return next(new ErrorHandler("Please enter UPI ID", 400));

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

  if (!accountNumber || !ifscCode || !accountHolderName || !bankName) {
    return next(new ErrorHandler("All bank details are required", 400));
  }

  const existingBank = await BankDetails.findOne({ accountNumber });
  if (existingBank)
    return next(new ErrorHandler("Bank details already exist", 400));

  const newBankDetails = await BankDetails.create({
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
  const bankDetails = await BankDetails.find();

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
