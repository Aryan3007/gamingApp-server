import { TryCatch } from "../middlewares/error.js";
import { Carousel } from "../models/carousel.js";
import {
  dltFileFromCloudinary,
  uploadFileToCloudinary,
} from "../utils/features.js";
import { ErrorHandler } from "../utils/utility-class.js";

const uploadImage = TryCatch(async (req, res, next) => {
  const { title } = req.body;
  const file = req.file;

  if (!title?.trim()) return next(new ErrorHandler("Please Enter Title", 400));
  if (!file) return next(new ErrorHandler("Please Upload an Image", 400));

  const allowedFormats = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (!allowedFormats.includes(file.mimetype)) {
    return next(
      new ErrorHandler(
        "Invalid file type. Only images (PNG, JPEG, JPG, WEBP) are allowed.",
        400
      )
    );
  }

  let image;
  try {
    const { public_id, url } = await uploadFileToCloudinary(file);
    if (!public_id || !url) {
      throw new Error("Invalid Cloudinary response");
    }
    image = { public_id, url };
  } catch (error) {
    return next(new ErrorHandler("Image upload failed. Try again later.", 500));
  }

  const carousel = await Carousel.create({
    title,
    image,
  });

  return res.status(201).json({
    success: true,
    data: carousel,
  });
});

const getImages = TryCatch(async (req, res, next) => {
  const images = await Carousel.find();

  return res.status(200).json({
    success: true,
    data: images,
  });
});

const dltImage = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  if (!id) return next(new ErrorHandler("Image ID is required", 400));

  const imageData = await Carousel.findById(id);
  if (!imageData) return next(new ErrorHandler("Image not found", 404));

  // Delete from Cloudinary
  const cloudinaryResponse = await dltFileFromCloudinary(
    imageData.image.public_id
  );

  if (!cloudinaryResponse.success) {
    return next(
      new ErrorHandler("Failed to delete image from Cloudinary", 500)
    );
  }

  // Delete from Database
  await Carousel.findByIdAndDelete(id);

  return res.status(200).json({
    success: true,
    message: "Image deleted successfully",
  });
});

export { dltImage, getImages, uploadImage };
