import mongoose, { Schema, model } from "mongoose";

const schema = new Schema(
  {
    matchId: {
      type: String,
      required: true,
    },
    marketId: {
      type: Number,
      required: true,
    },
    oddsData: {
      type: Object,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Odds = mongoose.models.Odds || model("Odds", schema);
