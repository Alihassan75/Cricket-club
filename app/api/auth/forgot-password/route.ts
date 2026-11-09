import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { generateOtp, hashOtp, otpExpiryDate, sendOtpEmail } from "@/lib/otp";
import { protect } from "@/lib/requestGuard";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const blocked = protect(req, body, { scope: "forgot", limit: 6, windowMs: 15 * 60_000, captcha: true });
    if (blocked) return blocked;
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
    }
    const { email } = parsed.data;

    await connectDB();
    const user = await User.findOne({ email });

    // Always return success so we don't leak which emails have accounts.
    if (!user || !user.isEmailVerified) {
      return NextResponse.json({ message: "If an account exists, a code has been sent." });
    }

    const otp = generateOtp();
    user.otpCodeHash = hashOtp(otp);
    user.otpPurpose = "reset_password";
    user.otpExpiresAt = otpExpiryDate();
    user.otpAttempts = 0;
    await user.save();

    await sendOtpEmail(email, otp, "reset_password");

    return NextResponse.json({ message: "If an account exists, a code has been sent." });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
