import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { generateOtp, hashOtp, otpExpiryDate, sendOtpEmail } from "@/lib/otp";
import { protect } from "@/lib/requestGuard";

const schema = z.object({
  email: z.string().email(),
  purpose: z.enum(["verify_email", "reset_password"]),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const blocked = protect(req, body, { scope: "resend", limit: 6, windowMs: 15 * 60_000 });
    if (blocked) return blocked;
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const { email, purpose } = parsed.data;

    await connectDB();
    const user = await User.findOne({ email });

    // Don't reveal whether the account exists.
    if (!user) {
      return NextResponse.json({ message: "If an account exists, a new code was sent." });
    }

    const otp = generateOtp();
    user.otpCodeHash = hashOtp(otp);
    user.otpPurpose = purpose;
    user.otpExpiresAt = otpExpiryDate();
    user.otpAttempts = 0;
    await user.save();

    await sendOtpEmail(email, otp, purpose);

    return NextResponse.json({ message: "A new code has been sent." });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
