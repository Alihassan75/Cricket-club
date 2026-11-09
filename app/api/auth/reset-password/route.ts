import { NextRequest, NextResponse } from "next/server";
import { protect } from "@/lib/requestGuard";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { hashOtp, MAX_OTP_ATTEMPTS } from "@/lib/otp";
import { zodMessage } from "@/lib/validation";

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const blocked = protect(req, body, { scope: "reset", limit: 20, windowMs: 15 * 60_000 });
    if (blocked) return blocked;
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: zodMessage(parsed.error) || "Invalid input" },
        { status: 400 }
      );
    }
    const { email, code, newPassword } = parsed.data;

    await connectDB();
    const user = await User.findOne({ email });

    if (!user || user.otpPurpose !== "reset_password" || !user.otpCodeHash) {
      return NextResponse.json({ error: "No pending reset for this email." }, { status: 400 });
    }
    if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
      return NextResponse.json(
        { error: "Too many attempts. Please request a new code." },
        { status: 429 }
      );
    }
    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return NextResponse.json({ error: "This code has expired. Request a new one." }, { status: 400 });
    }
    if (hashOtp(code) !== user.otpCodeHash) {
      user.otpAttempts += 1;
      await user.save();
      return NextResponse.json({ error: "Incorrect code." }, { status: 400 });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.otpCodeHash = undefined;
    user.otpPurpose = undefined;
    user.otpExpiresAt = undefined;
    user.otpAttempts = 0;
    await user.save();

    return NextResponse.json({ message: "Password reset. You can now sign in." });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
