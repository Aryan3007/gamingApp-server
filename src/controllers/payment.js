import { TryCatch } from "../middlewares/error.js";
import { PaymentHistory } from "../models/paymentHistory.js";
import { User } from "../models/user.js";
import { WithdrawHistory } from "../models/withdrawHistory.js";
import { ErrorHandler } from "../utils/utility-class.js";

const depositStatus = TryCatch(async (req, res, next) => {
  const { userId } = req.query;
  if (!userId) {
    return next(new ErrorHandler("User ID is required", 400));
  }

  const user = await User.findById(userId);
  if (!user) return next(new ErrorHandler("User Not Found", 404));

  const depositHistory = await PaymentHistory.find({ userId });
  const message =
    depositHistory.length > 0
      ? "Fetched deposit history successfully"
      : "No deposit history found";

  return res.status(200).json({
    success: true,
    message,
    depositHistory,
  });
});

const withdrawStatus = TryCatch(async (req, res, next) => {
  const { userId } = req.query;
  if (!userId) {
    return next(new ErrorHandler("User ID is required", 400));
  }

  const user = await User.findById(userId);
  if (!user) return next(new ErrorHandler("User Not Found", 404));

  const withdrawHistory = await WithdrawHistory.find({ userId });
  const message =
    withdrawHistory.length > 0
      ? "Fetched withdraw history successfully"
      : "No withdraw history found";

  return res.status(200).json({
    success: true,
    message,
    withdrawHistory,
  });
});

const paymentRequest = TryCatch(async (req, res, next) => {
  const { userId } = req.query;
  const { amount, referenceNumber } = req.body;

  if (!amount || !referenceNumber)
    return next(new ErrorHandler("Please enter all fields", 400));

  if (amount <= 0)
    return next(new ErrorHandler("Please enter valid amount", 400));

  const user = await User.findById(userId);
  if (!user) return next(new ErrorHandler("User Not Found", 404));

  const isDuplicate = await PaymentHistory.findOne({ referenceNumber });
  if (isDuplicate)
    return next(new ErrorHandler("Reference number already exists", 400));

  const paymentHistory = await PaymentHistory.create({
    userId,
    amount,
    referenceNumber,
  });

  return res.status(201).json({
    success: true,
    message: "Payment details recorded successfully",
    paymentHistory,
  });
});

const changePaymentStatus = TryCatch(async (req, res, next) => {
  const { userId, paymentId, status } = req.body;

  const validStatuses = ["completed", "failed", "pending"];
  if (!validStatuses.includes(status)) {
    return next(new ErrorHandler("Invalid status value", 400));
  }

  const user = await User.findById(userId);
  if (!user) return next(new ErrorHandler("User Not Found", 404));

  const paymentRecord = await PaymentHistory.findById(paymentId);

  if (!paymentRecord)
    return next(new ErrorHandler("Payment Record Not Found", 404));

  if (paymentRecord.status === "completed")
    return next(new ErrorHandler("Payment already verified", 400));

  if (paymentRecord.status === "failed" && status !== "pending")
    return next(
      new ErrorHandler("Cannot update a failed payment to this status", 400)
    );

  paymentRecord.status = status;
  try {
    await paymentRecord.save();
  } catch (error) {
    return next(new ErrorHandler("Error updating payment record", 500));
  }

  res.status(200).json({
    success: true,
    message: "Payment status updated successfully",
    paymentRecord,
  });
});

const withdrawRequest = TryCatch(async (req, res, next) => {
  const { userId } = req.query;
  const { amount, accNo, ifsc, contact, bankName, receiverName } = req.body;

  if (!userId) {
    return next(new ErrorHandler("User ID is required", 400));
  }

  if (!amount || !accNo || !ifsc || !contact || !bankName || !receiverName)
    return next(new ErrorHandler("All fields are required", 400));

  if (amount <= 100)
    return next(new ErrorHandler("Amount should be more than 100", 400));

  const user = await User.findById(userId);
  if (!user) return next(new ErrorHandler("User Not Found", 404));

  if (user.amount < amount) {
    return next(new ErrorHandler("Insufficient balance for withdrawal", 400));
  }

  if (contact.toString().length !== 10) {
    return next(new ErrorHandler("Invalid contact number", 400));
  }

  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  if (!ifscRegex.test(ifsc)) {
    return next(new ErrorHandler("Invalid IFSC code format", 400));
  }

  const withdrawhistory = await WithdrawHistory.create({
    userId,
    accNo,
    ifsc,
    contact,
    bankName,
    receiverName,
    amount,
  });

  return res.status(201).json({
    success: true,
    message:
      "Withdrawal request submitted successfully. It will be processed after admin approval.",
    withdrawhistory,
  });
});

const changeWithdrawStatus = TryCatch(async (req, res, next) => {
  const { userId, withdrawId, status } = req.body;

  const validStatuses = ["approved", "rejected", "pending"];
  if (!validStatuses.includes(status))
    return next(new ErrorHandler("Invalid status value", 400));

  const user = await User.findById(userId);
  if (!user) return next(new ErrorHandler("User Not Found", 404));

  const withdrawRecord = await WithdrawHistory.findById(withdrawId);

  if (!withdrawRecord)
    return next(new ErrorHandler("Payment Record Not Found", 404));

  if (withdrawRecord.status === "approved")
    return next(new ErrorHandler("Withdraw already verified", 400));

  if (status === "approved") {
    if (user.amount < withdrawRecord.amount) {
      return next(new ErrorHandler("Insufficient amount", 400));
    }
    user.amount -= withdrawRecord.amount;
    try {
      await user.save();
    } catch (error) {
      return next(new ErrorHandler("Error updating user balance", 500));
    }
  }
  withdrawRecord.status = status;
  try {
    await withdrawRecord.save();
  } catch (error) {
    return next(new ErrorHandler("Error updating withdrawal record", 500));
  }

  res.status(200).json({
    success: true,
    message: "Withdraw status updated successfully",
    withdrawRecord,
  });
});

export {
  changePaymentStatus,
  changeWithdrawStatus,
  depositStatus,
  paymentRequest,
  withdrawRequest,
  withdrawStatus,
};
