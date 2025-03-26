import { TryCatch } from "../middlewares/error.js";
import { BankDetails } from "../models/bankDetails.js";
import { QRCode } from "../models/qrCode.js";
import { UpiId } from "../models/upiId.js";
import { User } from "../models/user.js";
import { dltFileFromCloudinary } from "../utils/features.js";
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

  const id = await UpiId.findOne({ _id: upiId, userId: user._id });
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

  const bankDetail = await BankDetails.findOne({
    accountNumber,
    userId: user._id,
  });
  if (!bankDetail) return next(new ErrorHandler("Bank details not found", 400));

  await bankDetail.deleteOne();

  res.status(200).json({
    success: true,
    message: "Bank details deleted successfully",
  });
});

const addQRCode = TryCatch(async (req, res, next) => {
  const { title } = req.body;
  const file = req.file;

  if (!title?.trim()) return next(new ErrorHandler("Please Enter Title", 400));
  if (!file) return next(new ErrorHandler("Please Upload an Image", 400));

  const allowedFormats = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (!allowedFormats.includes(file.mimetype)) {
    return next(
      new ErrorHandler(
        "Invalid file type. Only images (PNG, JPEG, JPG, WEBP) are allowed.",
        400
      )
    );
  }

  const user = await User.findById(req.user);
  if (!user) return next(new ErrorHandler("User not found", 404));

  let qrCode;
  try {
    const { public_id, url } = await uploadFileToCloudinary(file);
    if (!public_id || !url) {
      throw new Error("Invalid Cloudinary response");
    }
    const existingQR = await QRCode.findOne({
      "qrCode.public_id": public_id,
    });
    if (existingQR) return next(new ErrorHandler("QR Code already exist", 400));
    qrCode = { public_id, url };
  } catch (error) {
    return next(new ErrorHandler("Image upload failed. Try again later.", 500));
  }

  const newQRCode = await QRCode.create({
    userId: user._id,
    title: title.trim(),
    qrCode,
  });

  res.status(200).json({
    success: true,
    message: "QR Code added successfully",
    qrCode: newQRCode,
  });
});

const getQRCode = TryCatch(async (req, res, next) => {
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

  const qrCodes = await QRCode.find({ userId });

  res.status(200).json({
    success: true,
    message: "QR Codes retrieved successfully",
    qrCodes,
  });
});

const deleteQRCode = TryCatch(async (req, res, next) => {
  const { qrCodeId } = req.body;
  if (!qrCodeId) return next(new ErrorHandler("QR Code ID is required", 400));

  const user = await User.findById(req.user);
  if (!user) return next(new ErrorHandler("User not found", 404));

  const qrCode = await QRCode.findOne({ _id: qrCodeId, userId: user._id });
  if (!qrCode) return next(new ErrorHandler("QR Code not found", 404));

  const cloudinaryResponse = await dltFileFromCloudinary(
    qrCode.qrCode.public_id
  );

  if (!cloudinaryResponse.success) {
    return next(
      new ErrorHandler("Failed to delete image from Cloudinary", 500)
    );
  }

  await QRCode.findByIdAndDelete(qrCodeId);

  res.status(200).json({
    success: true,
    message: "QR Code deleted successfully",
  });
});

export {
  addBankDetails,
  addQRCode,
  addUpiId,
  deleteBankDetails,
  deleteQRCode,
  deleteUpiId,
  getBankDetails,
  getQRCode,
  getUpiId,
};
