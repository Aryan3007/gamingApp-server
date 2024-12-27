import mongoose, { Schema, model } from "mongoose";

const schema = new Schema(
  {
    userID: {
      type: String,
      required: true,
      ref: "User",
    },
    amount: {
      type: Number,
      default: null,
    },
    referenceNumber: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["completed", "pending"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

export const PaymentHistory =
  mongoose.models.PaymentHistory || model("PaymentHistory", schema);
