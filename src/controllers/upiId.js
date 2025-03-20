import { TryCatch } from "../middlewares/error.js";
import { UpiId } from "../models/upiId.js";
import { ErrorHandler } from "../utils/utility-class.js";

const addUpiId = TryCatch(async (req, res, next) => {
  const { upiId } = req.body;
  if (!upiId) return next(new ErrorHandler("Please enter UPI ID", 400));

  const id = await UpiId.findOne({ upiId });
  if (id) return next(new ErrorHandler("Upi ID already exist", 400));

  const newUpiId = await UpiId.create({ upiId });

  res.status(200).json({
    success: true,
    message: "UPI ID added successfully",
    upiId: newUpiId,
  });
});

const getUpiId = TryCatch(async (req, res, next) => {
  const upiIds = await UpiId.find();

  res.status(200).json({
    success: true,
    message: "UPI IDs retrieved successfully",
    upiIds,
  });
});

const deleteUpiId = TryCatch(async (req, res, next) => {
  const { upiId } = req.body;
  if (!upiId) return next(new ErrorHandler("Please enter UPI ID", 400));

  const id = await UpiId.findOne({ upiId });
  if (!id) return next(new ErrorHandler("Invalid ID", 400));

  await id.deleteOne();

  res.status(200).json({
    success: true,
    message: "UPI ID deleted successfully",
  });
});

export { addUpiId, deleteUpiId, getUpiId };
