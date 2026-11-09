import { NextResponse } from "next/server";
import { getAuthFromCookies } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function GET() {
  const auth = getAuthFromCookies();
  if (!auth) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(auth.userId).select("-passwordHash -otpCodeHash");
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
}
