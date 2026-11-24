import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireStaff } from "@/lib/guard";

// Gives the browser a signed Cloudinary upload ticket so big videos go straight
// to Cloudinary (not through this server). Falls back to local disk when
// Cloudinary isn't configured (fine for development).
export async function GET() {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !apiKey || !secret) return NextResponse.json({ mode: "local" });

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "cricket-club";
  const signature = crypto.createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest("hex");
  return NextResponse.json({ mode: "cloudinary", cloud, apiKey, timestamp, folder, signature });
}
