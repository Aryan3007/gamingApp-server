import mongoose, { model, Schema } from "mongoose";

const bankSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      ref: "User",
    },
    accountNumber: {
      type: String,
      required: true,
      unique: true,
    },
    ifscCode: {
      type: String,
      required: true,
    },
    accountHolderName: {
      type: String,
      required: true,
    },
    bankName: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const BankDetails =
  mongoose.models.BankDetails || model("BankDetails", bankSchema);
