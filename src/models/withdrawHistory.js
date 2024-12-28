import mongoose, { Schema, model } from "mongoose";

const schema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      ref: "User",
    },
    accNo: {
      type: String,
      required: true,
    },
    ifsc: {
      type: String,
      required: true,
    },
    bankName: {
      type: String,
      required: true,
    },
    receiverName: {
      type: String,
      required: true,
    },
    contact: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 100,
    },
    status: {
      type: String,
      enum: ["approved", "rejected", "pending"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

export const WithdrawHistory =
  mongoose.models.WithdrawHistory || model("WithdrawHistory", schema);
