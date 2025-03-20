import mongoose, { model, Schema } from "mongoose";

const bankSchema = new Schema(
  {
    accountNumber: {
      type: String,
      required: true,
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
