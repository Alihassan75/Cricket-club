import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { generateOtp, hashOtp, otpExpiryDate, sendOtpEmail } from "@/lib/otp";
import { protect } from "@/lib/requestGuard";
import { zodMessage } from "@/lib/validation";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const blocked = protect(req, body, { scope: "register", limit: 10, windowMs: 60 * 60_000, captcha: true });
    if (blocked) return blocked;
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: zodMessage(parsed.error) || "Invalid input" },
        { status: 400 }
      );
    }
    const { name, email, password, phone } = parsed.data;

    await connectDB();

    const existing = await User.findOne({ email });
    if (existing && existing.isEmailVerified) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const otp = generateOtp();

    if (existing && !existing.isEmailVerified) {
      // Re-registering before verifying — update details + issue a fresh OTP.
      existing.name = name;
      existing.phone = phone;
      existing.passwordHash = passwordHash;
      existing.otpCodeHash = hashOtp(otp);
      existing.otpPurpose = "verify_email";
      existing.otpExpiresAt = otpExpiryDate();
      existing.otpAttempts = 0;
      await existing.save();
    } else {
      await User.create({
        name,
        email,
        phone,
        passwordHash,
        role: "customer",
        isEmailVerified: false,
        otpCodeHash: hashOtp(otp),
        otpPurpose: "verify_email",
        otpExpiresAt: otpExpiryDate(),
        otpAttempts: 0,
      });
    }

    await sendOtpEmail(email, otp, "verify_email");

    return NextResponse.json({ message: "OTP sent to email.", email });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
