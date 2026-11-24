import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { signToken, setAuthCookie } from "@/lib/auth";
import { protect } from "@/lib/requestGuard";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const blocked = protect(req, body, { scope: "login", limit: 15, windowMs: 15 * 60_000, captcha: true });
    if (blocked) return blocked;
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
    }
    const { email, password } = parsed.data;

    await connectDB();
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }

    if (!user.isEmailVerified) {
      return NextResponse.json(
        { error: "Please verify your email before signing in.", needsVerification: true, email: user.email },
        { status: 403 }
      );
    }

    if (user.isActive === false) {
      return NextResponse.json({ error: "This account has been switched off. Please contact the Backyard team." }, { status: 403 });
    }
    const token = signToken({ userId: user._id.toString(), role: user.role, email: user.email });
    setAuthCookie(token);

    return NextResponse.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
