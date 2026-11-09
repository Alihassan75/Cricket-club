import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { requireStaff } from "@/lib/guard";

const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

// Development fallback: stores files in /public/uploads. Don't rely on this on
// serverless hosts (Vercel) — configure Cloudinary there.
export async function POST(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });

  const ext = ALLOWED[file.type];
  if (!ext) return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
  if (file.size > 200 * 1024 * 1024) return NextResponse.json({ error: "File is too large (200MB max)." }, { status: 400 });

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
  await writeFile(path.join(dir, name), new Uint8Array(await file.arrayBuffer()));

  return NextResponse.json({
    url: `/uploads/${name}`,
    type: file.type.startsWith("video/") ? "video" : "image",
  });
}
