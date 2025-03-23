import QRCode from "qrcode";
import { TryCatch } from "../middlewares/error.js";
import { PaymentHistory } from "../models/paymentHistory.js";
import { UpiId } from "../models/upiId.js";
import { User } from "../models/user.js";
import { WithdrawHistory } from "../models/withdrawHistory.js";
import { calculateTotalExposure } from "../utils/helper.js";
import { ErrorHandler } from "../utils/utility-class.js";

const createPaymentIntent = TryCatch(async (req, res, next) => {
  const { amount } = req.body;
  if (!amount || isNaN(amount) || amount <= 0)
    return next(new ErrorHandler("Please enter a valid amount", 400));

  const user = await User.findById(req.user)
  if (!user) return next(new ErrorHandler("User not found", 404));

  const upiIds = await UpiId.find();
  if (upiIds.length === 0)
    return next(new ErrorHandler("No UPI ID available", 400));
  const randomIndex = Math.floor(Math.random() * upiIds.length);
  const upiId = upiIds[randomIndex].upiId;
  const receiverName = "Shaktiex";
  const currency = user.currency;

  const upiLink = `upi://pay?pa=${upiId}&pn=${receiverName}&am=${amount}&cu=${currency}`;

  QRCode.toDataURL(upiLink, (err, url) => {
    if (err) return next(new ErrorHandler("Error in generating QR Code", 400));

    return res.status(201).json({
      success: true,
      upiId,
      amount,
      url,
    });
  });
});

const depositHistory = TryCatch(async (req, res, next) => {
  const user = await User.findById(req.user, "_id role").lean();
  if (!user) return next(new ErrorHandler("User not found", 404));

  const userIds = await User.find({ parentUser: user._id }, "_id").distinct(
    "_id"
  );

  if (!userIds.length)
    return next(new ErrorHandler("No related users found.", 404));

  const history = await PaymentHistory.find({ userId: { $in: userIds } })
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json({
    success: true,
    message: history.length
      ? "Fetched deposit history successfully"
      : "No deposit history found",
    history,
  });
});

const getUserDepositHistory = TryCatch(async (req, res, next) => {
  const user = await User.findById(req.user, "_id role")
  if (!user) return next(new ErrorHandler("User not found", 404));

  if (user.role === "super_admin")
    return next(new ErrorHandler("Super Admin can't access this route", 400));

  const history = await PaymentHistory.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json({
    success: true,
    message: history.length
      ? "Fetched deposit history successfully"
      : "No deposit history found",
    history,
  });
});

const depositRequest = TryCatch(async (req, res, next) => {
  const { amount, referenceNumber } = req.body;

  const requester = await User.findById(req.user)
  if (!requester) return next(new ErrorHandler("User not found", 404));

  if (requester.status === "banned")
    return next(new ErrorHandler("You can't perform this action", 400));

  if (!amount || !referenceNumber)
    return next(new ErrorHandler("Please provide all fields", 400));

  if (isNaN(amount) || amount < 100)
    return next(
      new ErrorHandler("Invalid amount. Amount should be at least 100.", 400)
    );

  let parentUser;
  if (requester.role === "user") parentUser = requester.parentUser;
  else {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  if (!parentUser) return next(new ErrorHandler("Parent user not found", 404));

  const paymentRequest = await PaymentHistory.create({
    userId: requester._id,
    parentUser,
    userName: requester.name,
    currency: requester.currency,
    amount,
    referenceNumber,
  });

  return res.status(201).json({
    success: true,
    message:
      "Deposit request submitted successfully. It will be processed after admin approval.",
    paymentRequest,
  });
});

const changeDepositStatus = TryCatch(async (req, res, next) => {
  const { depositId, status } = req.body;

  const validStatuses = ["approved", "rejected"];
  if (!validStatuses.includes(status))
    return next(new ErrorHandler("Invalid status value", 400));

  const [user, depositRecord] = await Promise.all([
    User.findById(req.user),
    PaymentHistory.findById(depositId),
  ]);

  if (!user) return next(new ErrorHandler("User not found", 404));
  if (!depositRecord)
    return next(new ErrorHandler("Deposit record not found", 404));

  if (depositRecord.status === "approved")
    return next(new ErrorHandler("Deposit already verified", 400));

  const depositUser = await User.findById(depositRecord.userId);
  if (!depositUser) return next(new ErrorHandler("Requester not found", 404));

  if (user.role === "master") {
    if (depositUser.parentUser.toString() !== user._id.toString()) {
      return next(
        new ErrorHandler("Unauthorized to approve this deposit", 403)
      );
    }
  } else return next(new ErrorHandler("Unauthorized access", 403));

  if (status === "approved") {
    const exposure = await calculateTotalExposure(user._id);
    if (user.amount - exposure < depositRecord.amount)
      return next(new ErrorHandler("Insufficient funds", 400));

    await Promise.all([
      User.findByIdAndUpdate(user._id, {
        $inc: { amount: -depositRecord.amount },
      }),
      User.findByIdAndUpdate(depositUser._id, {
        $inc: { amount: depositRecord.amount },
      }),
    ]);
  }

  depositRecord.status = status;
  await depositRecord.save();

  res.status(200).json({
    success: true,
    message: `Deposit ${status} successfully`,
    depositRecord,
  });
});

const withdrawalHistory = TryCatch(async (req, res, next) => {
  const user = await User.findById(req.user, "_id role")
  if (!user) return next(new ErrorHandler("User not found", 404));

  const userIds = await User.find({ parentUser: user._id }, "_id").distinct(
    "_id"
  );

  if (!userIds.length)
    return next(new ErrorHandler("No related users found.", 404));

  const history = await WithdrawHistory.find({ userId: { $in: userIds } })
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json({
    success: true,
    message: history.length
      ? "Fetched withdrawal history successfully"
      : "No withdrawal history found",
    history,
  });
});

const getUserWithdrawlHistory = TryCatch(async (req, res, next) => {
  const user = await User.findById(req.user, "_id role")
  if (!user) return next(new ErrorHandler("User not found", 404));

  if (user.role === "super_admin")
    return next(new ErrorHandler("Super Admin can't access this route", 400));

  const history = await WithdrawHistory.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json({
    success: true,
    message: history.length
      ? "Fetched withdrawal history successfully"
      : "No withdrawal history found",
    history,
  });
});

const withdrawalRequest = TryCatch(async (req, res, next) => {
  const {
    amount,
    accountNumber,
    ifscCode,
    accountHolderName,
    bankName,
    contact,
  } = req.body;

  if (!amount || isNaN(amount) || amount < 300) {
    return next(
      new ErrorHandler("Invalid amount. Amount should be at least 300.", 400)
    );
  }

  if (
    !accountNumber ||
    !ifscCode ||
    !accountHolderName ||
    !bankName ||
    !contact
  ) {
    return next(
      new ErrorHandler("All bank details are required for withdrawal.", 400)
    );
  }

  const requester = await User.findById(req.user)
  if (!requester) return next(new ErrorHandler("User not found", 404));

  if (requester.status === "banned")
    return next(new ErrorHandler("You can't perform this action", 400));

  let parentUser;
  if (requester.role === "user" || requester.role === "master")
    parentUser = requester.parentUser;
  else return next(new ErrorHandler("Unauthorized access", 403));

  if (!parentUser) return next(new ErrorHandler("Parent user not found", 404));

  const exposure = await calculateTotalExposure(requester._id);
  if (requester.amount - exposure < amount)
    return next(new ErrorHandler("Insufficient balance for withdrawal", 400));

  requester.amount -= amount;
  await requester.save();

  const withdrawHistory = await WithdrawHistory.create({
    userId: requester._id,
    userName: requester.name.trim(),
    parentUser,
    amount,
    accountNumber: accountNumber.trim(),
    ifscCode: ifscCode.trim(),
    accountHolderName: accountHolderName.trim(),
    bankName: bankName.trim(),
    contact: contact.trim(),
  });

  return res.status(201).json({
    success: true,
    message:
      "Withdrawal request submitted successfully. It will be processed after admin approval.",
    withdrawHistory,
  });
});

const changeWithdrawStatus = TryCatch(async (req, res, next) => {
  const { withdrawId, status } = req.body;

  const validStatuses = ["approved", "rejected"];
  if (!validStatuses.includes(status))
    return next(new ErrorHandler("Invalid status value", 400));

  const user = await User.findById(req.user);
  if (!user) return next(new ErrorHandler("User Not Found", 404));

  const withdrawRecord = await WithdrawHistory.findById(withdrawId);
  if (!withdrawRecord)
    return next(new ErrorHandler("Withdraw record not found", 404));

  if (withdrawRecord.status === "approved")
    return next(new ErrorHandler("Withdrawal already verified", 400));

  const withdrawUser = await User.findById(withdrawRecord.userId);
  if (!withdrawUser) return next(new ErrorHandler("Requester not found", 404));

  if (user.role === "master" || user.role === "super_admin") {
    if (withdrawUser.parentUser.toString() !== user._id.toString()) {
      return next(
        new ErrorHandler("Unauthorized to approve this withdrawal", 403)
      );
    }
  } else {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  if (status === "approved") {
    if (user.role === "master") {
      await User.findByIdAndUpdate(user._id, {
        $inc: { amount: withdrawRecord.amount },
      });
    }
  } else {
    await User.findByIdAndUpdate(withdrawUser._id, {
      $inc: { amount: withdrawRecord.amount },
    });
  }

  withdrawRecord.status = status;
  await withdrawRecord.save();

  res.status(200).json({
    success: true,
    message: `Withdrawal ${status} successfully`,
    withdrawRecord,
  });
});

export {
  changeDepositStatus,
  changeWithdrawStatus,
  createPaymentIntent,
  depositHistory,
  depositRequest,
  getUserDepositHistory,
  getUserWithdrawlHistory,
  withdrawalHistory,
  withdrawalRequest,
};
