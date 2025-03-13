import axios from "axios";
import { TryCatch } from "../middlewares/error";

const cricketScore = TryCatch(async (req, res, next) => {
  const { eventId } = req.query;
  const response = await axios.get(
    `https://testscapi.fpl11.com/api/admin/cricketscore?eventid=${eventId}`
  );
  return res.status(200).json({
    success: true,
    message: "Score fetched successfully",
    score: response?.data,
  });
});

export { cricketScore };
