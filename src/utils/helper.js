import { Bet } from "../models/bet.js";
import { Margin } from "../models/margin.js";

const calculateProfitAndLoss = (stake, odds, type, category) => {
  let profit = 0;
  let loss = 0;

  category = category.toLowerCase().trim();
  type = type.toLowerCase().trim();

  if (!["match odds", "bookmaker", "fancy"].includes(category))
    return {
      error: "Invalid category! Must be 'match odds', 'bookmaker', or 'fancy'.",
    };

  if (!["back", "lay"].includes(type))
    return { error: "Invalid bet type! Must be 'back' or 'lay'." };

  const isBack = type === "back";

  switch (category) {
    case "match odds":
      profit = isBack ? stake * (odds - 1) : stake;
      loss = isBack ? -stake : -stake * (odds - 1);
      break;

    case "bookmaker":
      profit = isBack ? (odds * stake) / 100 : stake;
      loss = isBack ? -stake : -(odds * stake) / 100;
      break;

    case "fancy":
      profit = isBack ? (stake * odds) / 100 : stake;
      loss = isBack ? -stake : -(stake * odds) / 100;
      break;
  }

  return { profit, loss };
};

const calculateNewMargin = (margin, selectionId, type, profit, loss) => {
  const isSameSelection = margin.selectionId === selectionId;
  const isBack = type === "back";

  return {
    newProfit: margin.profit + (isSameSelection === isBack ? profit : loss),
    newLoss: margin.loss + (isSameSelection === isBack ? loss : profit),
  };
};

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

const calculateTotalExposure = async (userId) => {
  const nonFancyMarketIds = await Bet.distinct("marketId", {
    userId,
    status: "pending",
    category: { $ne: "fancy" },
  });

  const nonFancyMargins = await Margin.find({
    userId,
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
    userId,
    status: "pending",
    category: "fancy",
  });

  for (const eventId of eventIds) {
    const marketExposure = await calculateFancyExposure(userId, eventId);
    totalExposure += Object.values(marketExposure).reduce(
      (sum, value) => sum + Math.abs(value),
      0
    );
  }

  return totalExposure;
};

const getFormattedTimestamp = () => {
  return new Date()
    .toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(",", "");
};

export {
  calculateFancyExposure,
  calculateNewMargin,
  calculateProfitAndLoss,
  calculateTotalExposure,
  getFormattedTimestamp,
};
