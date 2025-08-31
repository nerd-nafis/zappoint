// server/src/seed-admin.ts
import "dotenv/config";
import { connectDB } from "../src/config/db";
import User from "../src/models/User";

(async () => {
  await connectDB(process.env.MONGO_URI || process.env.MONGODB_URI!);
  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const pass  = process.env.ADMIN_PASS  || "admin123";

  const existing = await User.findOne({ email });
  if (existing) { console.log("⚠️ Admin already exists"); process.exit(0); }

  await User.create({ name: "Admin", email, password: pass, role: "admin" });
  console.log("✅ Admin created:", email, "/", pass);
  process.exit(0);
})();
