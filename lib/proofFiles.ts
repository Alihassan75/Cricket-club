import crypto from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const MAX_PROOF_BYTES = 4 * 1024 * 1024;

/** Identifies the real file type from its first bytes (the browser-supplied type can't be trusted). */
export function sniffImage(b: Uint8Array): { ext: string; mime: string } | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (b.length > 12 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png", mime: "image/png" };
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { ext: "webp", mime: "image/webp" };
  return null;
}

/** Saves a payment screenshot and returns its URL: Cloudinary when configured, otherwise /public/uploads/proofs. */
export async function storeProof(buf: Buffer, img: { ext: string; mime: string }): Promise<string> {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME, key = process.env.CLOUDINARY_API_KEY, secret = process.env.CLOUDINARY_API_SECRET;
  if (cloud && key && secret) {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "cricket-club/payment-proofs";
    const signature = crypto.createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest("hex");
    const fd = new FormData();
    fd.append("file", new Blob([new Uint8Array(buf)], { type: img.mime }), `proof.${img.ext}`);
    fd.append("api_key", key);
    fd.append("timestamp", String(timestamp));
    fd.append("folder", folder);
    fd.append("signature", signature);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body: fd });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || !data.secure_url) throw new Error(data?.error?.message || "Image storage rejected the upload.");
    return data.secure_url as string;
  }
  try {
    const dir = path.join(process.cwd(), "public", "uploads", "proofs");
    await mkdir(dir, { recursive: true });
    const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${img.ext}`;
    await writeFile(path.join(dir, name), new Uint8Array(buf));
    return `/uploads/proofs/${name}`;
  } catch {
    throw new Error("File storage isn't set up on this server — add your Cloudinary keys to .env.");
  }
}
