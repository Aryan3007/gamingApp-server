import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const connectDB = (uri) => {
  mongoose
    .connect(uri, {
      dbName: "GameApp",
    })
    .then((c) => console.log(`DB connected to ${c.connection.host}`))
    .catch((err) => {
      console.error("Error connecting to MongoDB:", err.message || err);
      process.exit(1);
    });

  // Graceful shutdown of the database connection
  process.on("SIGINT", async () => {
    await mongoose.connection.close();
    console.log("MongoDB connection closed due to app termination");
    process.exit(0);
  });
};

const sendToken = (res, user, code, message) => {
  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);

  return res.status(code).json({
    success: true,
    user,
    message,
    token,
  });
};

export { connectDB, sendToken };
