import mongoose, { model, Schema } from "mongoose";

const schema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      ref: "User",
    },
    upiId: {
      type: String,
      required: [true, "Please enter Upi ID"],
    },
  },
  {
    timestamps: true,
  }
);

export const UpiId = mongoose.models.UpiId || model("UpiId", schema);
