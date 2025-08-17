import "dotenv/config";
import app from "./app";
import { connectDB } from "./config/db";

const PORT = process.env.PORT || 4000;
(async () => {
  await connectDB(process.env.MONGO_URI!);
  app.listen(PORT, () => console.log(`🚀 API listening on :${PORT}`));
})();
