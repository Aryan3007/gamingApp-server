import mongoose, { Schema, model } from "mongoose";
import { hash } from "bcrypt";

const schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter a name"],
    },
    currency: {
      type: String,
      required: [true, "Please enter a currency"],
    },
    role: {
      type: String,
      required: [true, "Please enter a role"],
      enum: ["super_admin", "admin", "user"],
      default: "user",
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: [true, "Please enter gender"],
    },
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "banned"],
      default: "active",
    },
    email: {
      type: String,
      required: [true, "Please enter a email address"],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Please enter a password"],
      select: false,
    },
    parentUser: {
      type: String,
      required: [true, "Please enter a parent user"],
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

schema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await hash(this.password, 10);
  next();
});

export const User = mongoose.models.User || model("User", schema);
