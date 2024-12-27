import { TryCatch } from "../middlewares/error.js";
import { PaymentHistory } from "../models/paymentHistory.js";
import { User } from "../models/user.js";
import { WithdrawHistory } from "../models/withdrawHistory.js";
import ErrorHandler from "../utils/utility-class.js";

const depositStatus = TryCatch(async (req, res, next) => {
  const { userId } = req.query;
  const user = await user.findById(userId);
  if (!user) return next(new ErrorHandler("User Not Found", 404));

  const depositHistory = await PaymentHistory.find({ userId });

  return res.status(200).json({
    success: true,
    message: "Fetched deposit history successfully",
    depositHistory,
  });
});

const withdrawStatus = TryCatch(async (req, res, next) => {
  const { userId } = req.query;
  const user = await user.findById(userId);
  if (!user) return next(new ErrorHandler("User Not Found", 404));

  const withdrawHistory = await WithdrawHistory.find({ userId });

  return res.status(200).json({
    success: true,
    message: "Fetched withdraw history successfully",
    withdrawHistory,
  });
});

const paymentRequest = TryCatch(async (req, res, next) => {
  const { userId } = req.query;
  const { amount, referenceNumber } = req.body;

  if (!amount || !referenceNumber)
    return next(new ErrorHandler("Please enter all fields", 400));

  if (amount < 0)
    return next(new ErrorHandler("Please enter valid amount", 400));

  const user = await User.findById(userId);
  if (!user) return next(new ErrorHandler("User Not Found", 404));

  const paymentHistory = await PaymentHistory.create({
    userId,
    amount,
    referenceNumber,
  });

  return res.status(200).json({
    success: true,
    message: "Payment details updated successfully",
    paymentHistory,
  });
});

const changePaymentStatus = TryCatch(async (req, res, next) => {
  const { userId, paymentId, status } = req.body;
  const user = await User.findById(userId);
  if (!user) return next(new ErrorHandler("User Not Found", 404));

  const paymentRecord = await PaymentHistory.findById(paymentId);

  if (!paymentRecord)
    return next(new ErrorHandler("Payment Record Not Found", 404));

  if (paymentRecord.status === "completed")
    return next(new ErrorHandler("Payment already verified", 400));

  paymentRecord.status = status;
  await paymentRecord.save();

  res.status(200).json({
    success: true,
    message: "Payment status updated successfully",
    paymentRecord,
  });
});

const withdrawRequest = TryCatch(async (req, res, next) => {
  const { userId } = req.query;
  const { amount, accNo, ifsc, contact, bankName, receiverName } = req.body;

  const user = await User.findById(userId);
  if (!user) return next(new ErrorHandler("User Not Found", 404));

  if (!amount || !accNo || !ifsc || !contact || !bankName || !receiverName)
    return next(new ErrorHandler("Please enter all fields", 400));

  if (amount <= 100)
    return next(new ErrorHandler("Amount should be more than 100", 400));

  const withdrawhistory = await WithdrawHistory.create({
    userId,
    accNo,
    ifsc,
    contact,
    bankName,
    receiverName,
    amount,
  });

  return res.status(200).json({
    success: true,
    message: "Withdraw request sent successfully",
    withdrawhistory,
  });
});

const changeWithdrawStatus = TryCatch(async (req, res, next) => {
  const { userId, withdrawId, status } = req.body;
  const user = await User.findById(userId);
  if (!user) return next(new ErrorHandler("User Not Found", 404));

  const withdrawRecord = WithdrawHistory.findById(withdrawId);

  if (!withdrawRecord)
    return next(new ErrorHandler("Payment Record Not Found", 404));

  if (withdrawRecord.status === "approved")
    return next(new ErrorHandler("Withdraw already verified", 400));

  if (status === "approved") {
    if (user.amount < withdrawRecord.amount) {
      return next(new ErrorHandler("Insufficient amount", 400));
    }
    user.coins -= coins;
  }
  withdrawRecord.status = status;
  await withdrawRecord.save();

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
