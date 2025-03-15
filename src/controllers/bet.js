import axios from "axios";
import { API_BASE_URL } from "../app.js";
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
  )
    return next(new ErrorHandler("Please provide all required fields", 400));

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

  let endpoint;
  if (category === "bookmaker")
    endpoint = `${API_BASE_URL}/RBookmaker?Mids=${marketId}`;
  else if (category === "match odds")
    endpoint = `${API_BASE_URL}/RMatchOdds?Mids=${marketId}`;
  else endpoint = `${API_BASE_URL}/RFancy?Mids=${marketId}`;

  const response = await axios.get(endpoint);
  if (!response.data || !response.data.length)
    return next(new ErrorHandler("Odds Expired", 400));

  const exposure = await getTotalExposure(req, res, next);
  if (user.amount - exposure < 0)
    return next(new ErrorHandler("Insufficient funds", 400));

  const { profit, loss, error } = calculateProfitAndLoss(
    stake,
    odds,
    type,
    category
  );
  if (error) return next(new ErrorHandler(error, 400));

  if (category === "fancy") {
    // const margins = await Margin.find({ userId: user._id, eventId, marketId });
    // const obj = {
    //   userId: user._id,
    //   eventId,
    //   marketId,
    //   fancyNumber,
    //   selectionId: type === "back" ? `1` : `2`,
    //   profit: type === "lay" ? profit : loss,
    //   loss: type === "lay" ? loss : profit,
    // };
    // const selectionGroups = { 1: [], 2: [] };

    // for (const margin of margins) {
    //   if (margin.selectionId === "1" || margin.selectionId === "2") {
    //     selectionGroups[margin.selectionId].push(margin);
    //   }
    // }
    // selectionGroups[obj.selectionId].push(obj);

    // let exposure = 0;
    // const usedBacks = new Set();
    // const usedLays = new Set();

    // for (const back of selectionGroups["1"]) {
    //   for (const lay of selectionGroups["2"]) {
    //     if (
    //       !usedBacks.has(back) &&
    //       !usedLays.has(lay) &&
    //       back.fancyNumber <= lay.fancyNumber
    //     ) {
    //       exposure +=
    //         lay.profit + Math.min(Math.abs(lay.loss), Math.abs(back.loss));
    //       usedBacks.add(back);
    //       usedLays.add(lay);
    //       break;
    //     }
    //   }
    // }

    // if (user.amount + loss + exposure < 0)
    //   return next(new ErrorHandler("Insufficient funds", 400));

    // user.amount += loss + exposure;
    // await user.save();

    await Margin.create({
      userId: user._id,
      eventId,
      marketId,
      fancyNumber,
      selectionId: type === "back" ? `1` : `2`,
      profit: type === "lay" ? profit : loss,
      loss: type === "lay" ? loss : profit,
    });
  } else {
    const margin = await Margin.findOne({ userId: user._id, eventId, marketId })
      .sort({ createdAt: -1 })
      .lean();

    if (!margin) {
      if (user.amount < Math.abs(loss))
        return next(new ErrorHandler("Insufficient balance", 400));

      // user.amount += loss;
      // await user.save();

      await Margin.create({
        userId: user._id,
        eventId,
        marketId,
        selectionId,
        profit: type === "back" ? profit : loss,
        loss: type === "back" ? loss : profit,
      });
    } else {
      const { newProfit, newLoss } = calculateNewMargin(
        margin,
        selectionId,
        type,
        profit,
        loss
      );

      // const oldNegative = Math.min(margin.profit, margin.loss, 0);
      // const newNegative = Math.min(newProfit, newLoss, 0);

      // user.amount += Math.abs(oldNegative) + newNegative;
      // await user.save();

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
    payout: stake + profit,
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

  if (bet.status === "pending") {
    if (status === "won") user.amount += bet.payout - bet.stake;
    else if (status === "lost") user.amount -= bet.stake;
  } else if (bet.status === "lost") {
    user.amount += bet.payout;
  } else {
    if (user.amount < bet.payout - 2 * bet.stake) {
      return next(
        new ErrorHandler("Insufficient balance to reverse winnings", 400)
      );
    }
    user.amount = user.amount - bet.payout - 2 * bet.stake;
  }

  await user.save();
  bet.status = status;
  await bet.save();

  return res.status(200).json({
    success: true,
    message: `Bet status changed successfully to ${status}`,
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

const calculateFancyExposure = async (userId, eventId) => {
  const margins = await Margin.find({ userId, eventId });

  const marketMargins = {};
  for (const margin of margins) {
    const { status } = await Bet.findOne({ marketId: margin.marketId }).sort({
      createdAt: -1,
    });
    if (status !== "pending") continue;
    if (!marketMargins[margin.marketId]) {
      marketMargins[margin.marketId] = [];
    }
    marketMargins[margin.marketId].push(margin);
  }

  const marketExposure = {};
  for (const [marketId, margins] of Object.entries(marketMargins)) {
    const selectionGroups = { 1: [], 2: [] };

    for (const margin of margins) {
      if (margin.selectionId === "1" || margin.selectionId === "2") {
        selectionGroups[margin.selectionId].push(margin);
      }
    }

    let exposure = 0;

    for (const margin of selectionGroups["2"]) exposure += margin.loss;
    for (const margin of selectionGroups["1"]) exposure += margin.profit;

    // console.log(selectionGroups["1"]);
    // console.log(selectionGroups["2"]);

    const usedBacks = new Set();
    const usedLays = new Set();

    for (const back of selectionGroups["1"]) {
      for (const lay of selectionGroups["2"]) {
        if (
          !usedBacks.has(back) &&
          !usedLays.has(lay) &&
          back.fancyNumber <= lay.fancyNumber
        ) {
          exposure +=
            lay.profit + Math.min(Math.abs(lay.loss), Math.abs(back.loss));
          usedBacks.add(back);
          usedLays.add(lay);
          break;
        }
      }
    }

    marketExposure[marketId] = exposure;
    // console.log(marketExposure);
  }

  return marketExposure;
};

const getFancyExposure = TryCatch(async (req, res, next) => {
  const user = await User.findById(req.user);
  if (!user) return next(new ErrorHandler("User not found", 404));

  const { eventId } = req.query;
  if (!eventId) return next(new ErrorHandler("Event ID is required", 400));

  const marketExposure = await calculateFancyExposure(user._id, eventId);

  return res.status(200).json({
    success: true,
    message: "Fancy exposure fetched successfully",
    marketExposure,
  });
});

const getTotalExposure = TryCatch(async (req, res, next) => {
  const user = await User.findById(req.user);
  if (!user) return next(new ErrorHandler("User not found", 404));

  const nonFancyMarketIds = await Bet.distinct("marketId", {
    userId: user._id,
    status: "pending",
    category: { $ne: "fancy" },
  });

  const nonFancyMargins = await Margin.find({
    userId: user._id,
    marketId: { $in: nonFancyMarketIds },
  })
    .sort({ createdAt: -1 })
    .lean();

  const latestMargins = {};
  for (const margin of nonFancyMargins) {
    if (!latestMargins[margin.marketId]) {
      latestMargins[margin.marketId] = margin;
    }
  }

  let totalExposure = 0;
  const margins = Object.values(latestMargins);
  for (const margin of margins) {
    let maxLoss = 0;
    if (margin.profit < 0 && margin.loss > 0)
      maxLoss += Math.abs(margin.profit);
    if (margin.profit < 0 && margin.loss < 0) {
      maxLoss += Math.max(Math.abs(margin.profit), Math.abs(margin.loss));
    } else if (margin.loss < 0) {
      maxLoss += Math.abs(margin.loss);
    }
    totalExposure += maxLoss;
  }

  const eventIds = await Bet.distinct("eventId", {
    userId: user._id,
    status: "pending",
    category: "fancy",
  });

  for (const eventId of eventIds) {
    const marketExposure = await calculateFancyExposure(user._id, eventId);
    totalExposure += Object.values(marketExposure).reduce(
      (sum, value) => sum + Math.abs(value),
      0
    );
  }

  return res.status(200).json({
    success: true,
    message: "Total exposure fetched successfully",
    exposure: totalExposure,
  });
});

export {
  betTransactions,
  changeBetStatus,
  getBets,
  getFancyExposure,
  getMargins,
  getTotalExposure,
  placeBet,
};
