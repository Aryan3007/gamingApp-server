import mongoose, { Schema, model } from "mongoose";

const schema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      ref: "User",
    },
    eventId: {
      type: String,
      required: true,
    },
    marketId: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["match odds", "bookmaker", "fancy"],
      required: true,
    },
    type: {
      type: String,
      enum: ["back", "lay", "yes", "no"],
      required: true,
    },
    selectionId: {
      type: String,
      default: null,
    },
    fancyNumber: {
      type: Number,
      default: null,
    },
    stake: {
      type: Number,
      required: true,
    },
    odds: {
      type: Number,
      required: true,
    },
    payout: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["won", "pending", "lost"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

export const Bet = mongoose.models.Bet || model("Bet", schema);
