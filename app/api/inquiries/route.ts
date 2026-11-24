import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Inquiry, { INQUIRY_STATUSES } from "@/models/Inquiry";
import { requireSuperAdmin } from "@/lib/guard";
import { protect } from "@/lib/requestGuard";
import { parseInquiry } from "@/lib/inquiry";
import { notify } from "@/lib/notifications";
import ArenaSettings from "@/models/ArenaSettings";
import { PAYMENT_METHODS } from "@/models/Booking";
import { MAX_PROOF_BYTES, sniffImage, storeProof } from "@/lib/proofFiles";

/**
 * PUBLIC: the "Play with us" form on the website (no account needed).
 * Protected by a captcha, an attempt limit and a hidden trap field for bots. The same phone number
 * can't flood the inbox: a repeat within 24 hours is acknowledged but not saved twice.
 */
export async function POST(req: NextRequest) {
  // The form is sent as multipart so the payment screenshot can travel with it (JSON is still accepted).
  let body: any = {};
  let file: File | null = null;
  if ((req.headers.get("content-type") || "").includes("multipart/form-data")) {
    try {
      const form = await req.formData();
      form.forEach((v, k) => { if (typeof v === "string") body[k] = v; });
      const f = form.get("file");
      if (f instanceof File && f.size > 0) file = f;
    } catch {
      return NextResponse.json({ error: "Could not read the upload. Please try again." }, { status: 400 });
    }
  } else {
    body = await req.json().catch(() => ({}));
  }
  // 20 per hour per address: many phone users share one network address, so this is kept generous
  const blocked = protect(req, body, { scope: "inquiry", limit: 20, windowMs: 60 * 60_000, captcha: true });
  if (blocked) return blocked;
  if (body.website) return NextResponse.json({ ok: true }); // bots fill the hidden field — pretend it worked

  const parsed = parseInquiry(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    await connectDB();
    const since = new Date(Date.now() - 24 * 3600_000);
    if (await Inquiry.findOne({ phone: parsed.data.phone, createdAt: { $gte: since } })) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    const settings = await ArenaSettings.findOne().select("playRegistrationFee");
    const registrationFee = Number(settings?.playRegistrationFee ?? 500) || 0;

    // Payment screenshot: required whenever there is a fee to pay.
    const method = String(body.paymentMethod || "");
    const reference = String(body.paymentReference || "").trim().slice(0, 60);
    let paymentProofUrl: string | undefined;
    if (registrationFee > 0 && !file) return NextResponse.json({ error: "Please attach a screenshot of your payment." }, { status: 400 });
    if (file) {
      if (!(PAYMENT_METHODS as string[]).includes(method)) return NextResponse.json({ error: "Please choose how you paid (JazzCash, Easypaisa or Bank transfer)." }, { status: 400 });
      if (file.size > MAX_PROOF_BYTES) return NextResponse.json({ error: "That image is too large (4 MB max). Try a smaller screenshot." }, { status: 400 });
      const buf = Buffer.from(await file.arrayBuffer());
      const img = sniffImage(new Uint8Array(buf));
      if (!img) return NextResponse.json({ error: "Please upload a JPG, PNG or WebP screenshot." }, { status: 400 });
      paymentProofUrl = await storeProof(buf, img);
    }

    await Inquiry.create({
      ...parsed.data, registrationFee, feePaid: false,
      ...(paymentProofUrl ? { paymentProofUrl, paymentMethod: method, paymentReference: reference || undefined } : {}),
    });
    const when = [parsed.data.preferredDate, parsed.data.preferredTime].filter(Boolean).join(" · ");
    await notify("inquiry", "New play request", `${parsed.data.name} (${parsed.data.phone}) wants to play — ${when}.${paymentProofUrl ? " Payment screenshot attached." : ""}`);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: any) {
    console.error("Inquiry save failed:", e);
    return NextResponse.json({ error: e?.message?.includes("storage") ? e.message : "We couldn't save your request just now. Please try again in a moment." }, { status: 500 });
  }
}

/** Staff: the inbox. ?status=new|contacted|booked|closed and ?q= search. */
export async function GET(req: NextRequest) {
  const guard = requireSuperAdmin();
  if ("error" in guard) return guard.error;
  const sp = req.nextUrl.searchParams;
  const filter: Record<string, unknown> = {};
  const status = sp.get("status");
  if (status && (INQUIRY_STATUSES as string[]).includes(status)) filter.status = status;
  await connectDB();
  const inquiries = await Inquiry.find(filter).sort({ createdAt: -1 }).limit(500);
  return NextResponse.json({ inquiries });
}
