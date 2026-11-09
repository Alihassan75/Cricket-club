import { NextRequest, NextResponse } from "next/server";
import { protect } from "@/lib/requestGuard";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { hashOtp, MAX_OTP_ATTEMPTS } from "@/lib/otp";
import { signToken, setAuthCookie } from "@/lib/auth";
import { getOrCreatePortalCustomer } from "@/lib/portalCustomer";

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const blocked = protect(req, body, { scope: "verify", limit: 20, windowMs: 15 * 60_000 });
    if (blocked) return blocked;
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
    }
    const { email, code } = parsed.data;

    await connectDB();
    const user = await User.findOne({ email });

    if (!user || user.otpPurpose !== "verify_email" || !user.otpCodeHash) {
      return NextResponse.json({ error: "No pending verification for this email." }, { status: 400 });
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

    user.isEmailVerified = true;
    user.otpCodeHash = undefined;
    user.otpPurpose = undefined;
    user.otpExpiresAt = undefined;
    user.otpAttempts = 0;
    await user.save();

    // Give every new customer a profile right away so staff see them in Customers.
    if (user.role === "customer") {
      try {
        await getOrCreatePortalCustomer(user._id.toString());
      } catch (e) {
        console.error("Customer profile creation failed:", e);
      }
    }

    const token = signToken({ userId: user._id.toString(), role: user.role, email: user.email });
    setAuthCookie(token);

    return NextResponse.json({
      message: "Email verified.",
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
