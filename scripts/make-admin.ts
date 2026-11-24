/**
 * Safe way to get an admin login — does NOT touch any other data (unlike `npm run seed`).
 *
 *   npm run make:admin -- you@gmail.com                      → makes an EXISTING account an admin
 *   npm run make:admin -- admin@club.pk "StrongPass123" "Ali Hassan"   → creates a NEW admin account
 *   (add a password to an existing email to reset its password too)
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User";

async function main() {
  const [rawEmail, password, ...nameParts] = process.argv.slice(2);
  if (!rawEmail) {
    console.log('Usage:\n  npm run make:admin -- <email>\n  npm run make:admin -- <email> <password> "<full name>"');
    process.exit(1);
  }
  const email = rawEmail.trim().toLowerCase();
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set in .env");
  await mongoose.connect(uri);

  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = "super_admin";
    existing.isEmailVerified = true;
    if (password) {
      if (password.length < 8) throw new Error("Password must be at least 8 characters.");
      existing.passwordHash = await bcrypt.hash(password, 10);
    }
    await existing.save();
    console.log(`✔ ${email} is now an admin (super_admin).${password ? " Password updated." : " Log out and log in again."}`);
  } else {
    if (!password) throw new Error(`No account exists for ${email}. Add a password to create one:\n  npm run make:admin -- ${email} "StrongPass123" "Your Name"`);
    if (password.length < 8) throw new Error("Password must be at least 8 characters.");
    await User.create({
      name: nameParts.join(" ").trim() || "Club Admin",
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: "super_admin",
      isEmailVerified: true,
      otpAttempts: 0,
    });
    console.log(`✔ Admin account created: ${email}`);
  }
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("✖", e.message || e);
  process.exit(1);
});
