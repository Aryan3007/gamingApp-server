import mongoose, { Schema, model } from "mongoose";

const schema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      ref: "User",
    },
    parentUser: {
      type: String,
      required: true,
      ref: "User",
    },
    userName: {
      type: String,
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    referenceNumber: {
      type: String,
      default: null,
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

export const PaymentHistory =
  mongoose.models.PaymentHistory || model("PaymentHistory", schema);
