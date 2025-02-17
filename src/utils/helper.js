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

export { calculateNewMargin, calculateProfitAndLoss, getFormattedTimestamp };
