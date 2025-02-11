import { TryCatch } from "../middlewares/error.js";
import { Bet } from "../models/bet.js";
import { User } from "../models/user.js";
import { ErrorHandler } from "../utils/utility-class.js";

const calculateProfitAndLoss = (stake, odds, type, category) => {
  let profit = 0;
  let loss = 0;

  category = category.toLowerCase().trim();
  type = type.toLowerCase().trim();

  switch (category) {
    case "match odds":
      if (type === "back") {
        profit = stake * (odds - 1);
        loss = stake;
      } else if (type === "lay") {
        profit = stake;
        loss = stake * (odds - 1);
      } else {
        return { error: "Invalid bet type! Must be 'back' or 'lay'." };
      }
      break;

    case "bookmaker":
      if (type === "back") {
        profit = (odds * stake) / 100;
        loss = stake;
      } else if (type === "lay") {
        profit = stake;
        loss = (odds * stake) / 100;
      } else {
        return { error: "Invalid bet type! Must be 'back' or 'lay'." };
      }
      break;

    case "fancy":
      if (type === "back") {
        profit = (stake * odds) / 100;
        loss = stake;
      } else if (type === "lay") {
        profit = stake;
        loss = (stake * odds) / 100;
      } else {
        return { error: "Invalid bet type! Must be 'back' or 'lay'." };
      }
      break;

    default:
      return {
        error:
          "Invalid category! Must be 'match odds', 'bookmaker', or 'fancy'.",
      };
  }

  return { profit, loss };
};

const placeBet = TryCatch(async (req, res, next) => {
  const user = await User.findById(req.user);
  const {
    eventId,
    match,
    marketId,
    selectionId,
    fancyNumber,
    stake,
    odds,
    category,
    type,
  } = req.body;

  if (!user) return next(new ErrorHandler("User not found", 404));

  if (!eventId || !marketId || !stake || !odds || !category || !type || !match)
    return next(new ErrorHandler("Please provide all fields", 400));

  if (category.toLowerCase() !== "fancy" && !selectionId)
    return next(new ErrorHandler("Please provide Selection ID", 400));

  if (category.toLowerCase() === "fancy" && !fancyNumber)
    return next(new ErrorHandler("Please provide fancy number", 400));

  if (category.toLowerCase() === "fancy" && (stake < 100 || stake > 500000))
    return next(
      new ErrorHandler(
        "Invalid stake amount! It must be between 100 and 5 Lakh",
        400
      )
    );

  const { profit, loss, error } = calculateProfitAndLoss(
    stake,
    odds,
    type,
    category
  );

  if (error) return next(new ErrorHandler(error, 400));

  if (user.amount < loss)
    return next(new ErrorHandler("Insufficient balance", 400));

  user.amount -= loss;

  const newBet = await Bet.create({
    userId: user._id,
    eventId,
    match,
    marketId,
    selectionId,
    fancyNumber,
    stake,
    odds,
    category: category.toLowerCase().trim(),
    type: type.toLowerCase().trim(),
    payout: stake + profit,
  });

  await user.save();

  return res.status(201).json({
    success: true,
    message: "Bet placed successfully",
    newBet,
  });
});

const betTransactions = TryCatch(async (req, res, next) => {
  const user = await User.findById(req.user);
  if (!user) return next(new ErrorHandler("User not found", 404));

  const bets = await Bet.find({ userId: user._id });

  return res.status(200).json({
    success: true,
    message: "Bets fetched successfully",
    bets,
  });
});

const getAllBets = TryCatch(async (req, res, next) => {
  const bets = await Bet.find();

  return res.status(200).json({
    success: true,
    message: "Bets fetched successfully",
    bets,
  });
});

const getPendingBets = TryCatch(async (req, res, next) => {
  const bets = await Bet.find({ status: "pending" });

  return res.status(200).json({
    success: true,
    message: "Bets fetched successfully",
    bets,
  });
});

const changeBetStatus = TryCatch(async (req, res, next) => {
  const { betId, status } = req.body;

  const validStatuses = ["won", "lost", "pending"];
  if (!validStatuses.includes(status)) {
    return next(new ErrorHandler("Invalid status value", 400));
  }

  const bet = await Bet.findById(betId);
  if (!bet) return next(new ErrorHandler("Bet not found", 404));

  if (bet.status === status)
    return next(
      new ErrorHandler(`Bet status is already set to ${status}`, 400)
    );

  const allowedTransitions = {
    pending: ["won", "lost"],
    won: ["lost"],
    lost: ["won"],
  };

  if (!allowedTransitions[bet.status].includes(status)) {
    return next(
      new ErrorHandler(
        `Cannot change status from ${bet.status} to ${status}`,
        400
      )
    );
  }

  const user = await User.findById(bet.userId);
  if (!user) return next(new ErrorHandler("User not found", 404));

  if (bet.status === "won" && status === "lost") {
    if (user.amount < bet.payout) {
      return next(
        new ErrorHandler("Insufficient balance to reverse winnings", 400)
      );
    }
    user.amount -= bet.payout;
  } else if (status === "won") {
    user.amount += bet.payout;
  }

  await user.save();
  bet.status = status;
  await bet.save();

  return res.status(200).json({
    success: true,
    message: "Bet status changed successfully",
    bet,
  });
});

export {
  placeBet,
  betTransactions,
  getAllBets,
  getPendingBets,
  changeBetStatus,
};
