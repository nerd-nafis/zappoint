import mongoose from "mongoose";
export const connectDB = async (uri: string) => {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log("✅ Mongo connected");
};
