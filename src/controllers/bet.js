import { TryCatch } from "../middlewares/error.js";
import { Bet } from "../models/bet.js";
import { Margin } from "../models/margin.js";
import { User } from "../models/user.js";
import { calculateNewMargin, calculateProfitAndLoss } from "../utils/helper.js";
import { ErrorHandler } from "../utils/utility-class.js";

const placeBet = TryCatch(async (req, res, next) => {
  const user = await User.findById(req.user);
  if (!user) return next(new ErrorHandler("User not found", 404));

  let {
    eventId,
    match,
    marketId,
    selection,
    selectionId,
    fancyNumber,
    stake,
    odds,
    category,
    type,
  } = req.body;
  let payout = 0;

  category = category?.toLowerCase().trim();
  type = type?.toLowerCase().trim();

  if (
    !(
      eventId &&
      marketId &&
      stake &&
      odds &&
      category &&
      type &&
      match &&
      selection
    )
  ) {
    return next(new ErrorHandler("Please provide all required fields", 400));
  }

  const validCategories = ["match odds", "fancy", "bookmaker"];
  const validTypes = ["back", "lay"];

  if (!validCategories.includes(category))
    return next(new ErrorHandler("Invalid Category", 400));
  if (!validTypes.includes(type))
    return next(new ErrorHandler("Invalid Type", 400));

  if (category !== "fancy" && !selectionId)
    return next(new ErrorHandler("Selection ID is required", 400));

  if (category === "fancy") {
    if (!fancyNumber)
      return next(new ErrorHandler("Please provide a fancy number", 400));
    if (stake < 100 || stake > 500000)
      return next(
        new ErrorHandler("Stake must be between 100 and 5 Lakh", 400)
      );
  }

  const { profit, loss, error } = calculateProfitAndLoss(
    stake,
    odds,
    type,
    category
  );
  if (error) return next(new ErrorHandler(error, 400));

  if (category === "fancy") {
    if (user.amount < Math.abs(loss))
      return next(new ErrorHandler("Insufficient balance", 400));

    user.amount += loss;
    await user.save();
  } else {
    const margin = await Margin.findOne({ userId: user._id, eventId, marketId })
      .sort({ createdAt: -1 })
      .lean();

    if (!margin) {
      if (user.amount < Math.abs(loss))
        return next(new ErrorHandler("Insufficient balance", 400));

      user.amount += loss;
      await user.save();

      await Margin.create({
        userId: user._id,
        eventId,
        marketId,
        selectionId,
        profit,
        loss,
      });
    } else {
      const { newProfit, newLoss } = calculateNewMargin(
        margin,
        selectionId,
        type,
        profit,
        loss
      );

      const oldNegative = Math.min(margin.profit, margin.loss, 0);
      const newNegative = Math.min(newProfit, newLoss, 0);

      user.amount += Math.abs(oldNegative) + newNegative;
      await user.save();

      await Margin.create({
        userId: user._id,
        eventId,
        marketId,
        selectionId,
        profit: margin.selectionId === selectionId ? newProfit : newLoss,
        loss: margin.selectionId === selectionId ? newLoss : newProfit,
      });
    }
  }

  if (category === "match odds") payout = odds * stake;
  else if (category === "bookmaker") payout = (odds * stake) / 100;
  else payout = stake + profit;

  const newBet = await Bet.create({
    userId: user._id,
    eventId,
    match,
    selection,
    marketId,
    selectionId,
    fancyNumber,
    stake,
    odds,
    category,
    type,
    payout,
  });

  return res.status(201).json({
    success: true,
    message: "Bet placed successfully",
    newBet,
  });
});

const betTransactions = TryCatch(async (req, res, next) => {
  const user = await User.findById(req.user);
  if (!user) return next(new ErrorHandler("User not found", 404));

  const { eventId } = req.query;

  const filter = { userId: user._id };
  if (eventId) filter.eventId = eventId;

  const bets = await Bet.find(filter).sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    message: "Bets fetched successfully",
    bets,
  });
});

const getBets = TryCatch(async (req, res, next) => {
  const { status, userId, selectionId, eventId, category, type } = req.query;

  const filter = {};

  if (status) {
    if (!["won", "pending", "lost"].includes(status)) {
      return next(new ErrorHandler("Invalid status", 400));
    }
    filter.status = status;
  }

  if (type) {
    if (!["back", "lay"].includes(type)) {
      return next(new ErrorHandler("Invalid type", 400));
    }
    filter.type = type;
  }

  if (category) {
    if (!["match odds", "bookmaker", "fancy"].includes(category)) {
      return next(new ErrorHandler("Invalid category", 400));
    }
    filter.category = category;
  }

  if (userId) filter.userId = userId;
  if (selectionId) filter.selectionId = selectionId;
  if (eventId) filter.eventId = eventId;

  const bets = await Bet.find(filter).sort({ createdAt: -1 });

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

const getMargins = TryCatch(async (req, res, next) => {
  const user = await User.findById(req.user);
  if (!user) return next(new ErrorHandler("User Not Found", 400));

  const { eventId } = req.query;
  if (!eventId) return next(new ErrorHandler("Event ID is required", 400));

  const margins = await Margin.find({ userId: user._id, eventId }).sort({
    createdAt: -1,
  });

  const latestMargins = {};
  for (const margin of margins) {
    if (!latestMargins[margin.marketId]) {
      latestMargins[margin.marketId] = margin;
    }
  }

  return res.status(200).json({
    success: true,
    message: "Margins fetched successfully",
    margins: latestMargins,
  });
});

export { placeBet, betTransactions, getBets, changeBetStatus, getMargins };
