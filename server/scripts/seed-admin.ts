import "dotenv/config";
import { connectDB } from "../src/config/db";
import User from "../src/models/User";

(async () => {
  try {
    await connectDB(process.env.MONGO_URI!);

    const adminEmail = "admin@example.com";
    const existing = await User.findOne({ email: adminEmail });
    if (existing) {
      console.log("⚠️ Admin already exists:", adminEmail);
      process.exit(0);
    }

    await User.create({
      name: "Admin",
      email: adminEmail,
      password: "admin123",
      role: "admin"
    });

    console.log("✅ Admin created:", adminEmail, "/ admin123");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
