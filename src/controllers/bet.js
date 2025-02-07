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
      if (type === "yes") {
        profit = (stake * odds) / 100;
        loss = stake;
      } else if (type === "no") {
        profit = stake;
        loss = (stake * odds) / 100;
      } else {
        return { error: "Invalid bet type! Must be 'yes' or 'no'." };
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
  const { userId } = req.query;
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

  if (!eventId || !marketId || !stake || !odds || !category || !type || !match)
    return next(new ErrorHandler("Please provide all fields", 400));

  if (category.toLowerCase() !== "fancy" && !selectionId)
    return next(new ErrorHandler("Please provide Selection ID", 400));

  if (category.toLowerCase() === "fancy" && !fancyNumber)
    return next(new ErrorHandler("Please provide fancy number", 400));

  const user = await User.findById(userId);
  if (!user) return next(new ErrorHandler("User not found", 404));

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
    userId,
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
  const { userId } = req.query;

  const user = await User.findById(userId);
  if (!user) return next(new ErrorHandler("User not found", 404));

  const bets = await Bet.find({ userId });

  return res.status(200).json({
    success: true,
    message: "Bets fetched successfully",
    bets,
  });
});

export { placeBet, betTransactions };
