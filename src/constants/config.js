export const corsOption = {
  origin: [
    "http://localhost:5173",
    "https://localhost:4173",
    process.env.CLIENT_URL,
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};
