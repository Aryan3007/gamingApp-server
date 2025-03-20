import { TryCatch } from "../middlewares/error.js";
import { PaymentHistory } from "../models/paymentHistory.js";
import { User } from "../models/user.js";
import { WithdrawHistory } from "../models/withdrawHistory.js";
import { calculateTotalExposure } from "../utils/helper.js";
import { ErrorHandler } from "../utils/utility-class.js";

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
  const user = await User.findById(req.user, "_id role").lean();
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

  const requester = await User.findById(req.user).lean();
  if (!requester) return next(new ErrorHandler("User not found", 404));

  if (requester.status === "banned")
    return next(new ErrorHandler("You can't perform this action", 400));

  if (!amount || !referenceNumber)
    return next(new ErrorHandler("Please provide all fields", 400));

  if (isNaN(amount) || amount <= 100)
    return next(
      new ErrorHandler("Invalid amount. Enter a number greater than 100.", 400)
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

  if (user.role === "master" && !depositUser.parentUser.equals(user._id))
    return next(new ErrorHandler("Unauthorized to approve this deposit", 403));

  if (user.role !== "master")
    return next(new ErrorHandler("Unauthorized access", 403));

  if (status === "approved") {
    const exposure = await calculateTotalExposure(user._id);
    if (user.amount - exposure < depositRecord.amount)
      return next(new ErrorHandler("Insufficient funds", 400));

    await Promise.all([
      user.findByIdAndUpdate(user._id, {
        $inc: { amount: -depositRecord.amount },
      }),
      user.findByIdAndUpdate(depositUser._id, {
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
  const user = await User.findById(req.user, "_id role").lean();
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
  const user = await User.findById(req.user, "_id role").lean();
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
  const { amount } = req.body;

  const requester = await User.findById(req.user).lean();
  if (!requester) return next(new ErrorHandler("User not found", 404));

  if (requester.status === "banned")
    return next(new ErrorHandler("You can't perform this action", 400));

  if (!amount || isNaN(amount) || amount <= 100)
    return next(
      new ErrorHandler("Invalid amount. Enter a number greater than 100.", 400)
    );

  let parentUser;
  if (requester.role === "user" || requester.role === "master") {
    parentUser = requester.parentUser;
  } else {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  if (!parentUser) return next(new ErrorHandler("Parent user not found", 404));

  const exposure = await calculateTotalExposure(requester._id);
  if (requester.amount - exposure < amount)
    return next(new ErrorHandler("Insufficient balance for withdrawal", 400));

  const withdrawHistory = await WithdrawHistory.create({
    userId: requester._id,
    userName: requester.name,
    parentUser,
    amount,
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

  if (user.role === "master") {
    if (withdrawUser.parentUser.toString() !== user._id.toString()) {
      return next(
        new ErrorHandler("Unauthorized to approve this withdrawal", 403)
      );
    }
  } else if (user.role === "super_admin") {
    if (withdrawUser.parentUser.toString() !== user._id.toString()) {
      return next(
        new ErrorHandler("Unauthorized to approve this withdrawal", 403)
      );
    }
  } else {
    return next(new ErrorHandler("Unauthorized access", 403));
  }

  if (status === "approved") {
    if (withdrawUser.amount < withdrawRecord.amount) {
      return next(new ErrorHandler("Insufficient funds", 400));
    }
    withdrawUser.amount -= withdrawRecord.amount;
    await withdrawUser.save();
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
  changeWithdrawStatus,
  depositHistory,
  getUserDepositHistory,
  getUserWithdrawlHistory,
  withdrawalHistory,
  withdrawalRequest,
  depositRequest,
  changeDepositStatus,
};
