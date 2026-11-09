import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking, { PAYMENT_METHODS } from "@/models/Booking";
import { requireAuth } from "@/lib/guard";
import { getOrCreatePortalCustomer } from "@/lib/portalCustomer";
import { rateLimit } from "@/lib/rateLimit";
import { MAX_PROOF_BYTES, sniffImage, storeProof } from "@/lib/proofFiles";
import { PROOF_REVIEW_HOURS, releaseExpiredHolds } from "@/lib/holds";

/** Customer uploads a payment screenshot for one of their own pending bookings. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireAuth();
  if ("error" in guard) return guard.error;
  const rl = rateLimit(`proof:${guard.auth.userId}`, 10, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many uploads — please wait a few minutes." }, { status: 429 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the upload. Please try again." }, { status: 400 });
  }
  const file = form.get("file");
  const method = String(form.get("method") || "");
  const reference = String(form.get("reference") || "").trim().slice(0, 60);

  if (!(file instanceof File)) return NextResponse.json({ error: "Please choose a screenshot of your payment." }, { status: 400 });
  if (!(PAYMENT_METHODS as string[]).includes(method)) return NextResponse.json({ error: "Please choose how you paid (JazzCash, Easypaisa or Bank transfer)." }, { status: 400 });
  if (file.size > MAX_PROOF_BYTES) return NextResponse.json({ error: "That image is too large (4 MB max). Try a smaller screenshot." }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  const img = sniffImage(new Uint8Array(buf));
  if (!img) return NextResponse.json({ error: "Please upload a JPG, PNG or WebP screenshot." }, { status: 400 });

  try {
    await connectDB();
    await releaseExpiredHolds(true);
    const customer = await getOrCreatePortalCustomer(guard.auth.userId);
    const booking = await Booking.findById(params.id);
    if (!booking || booking.customer?.toString() !== customer._id.toString()) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }
    if (booking.status !== "Pending") {
      return NextResponse.json(
        { error: booking.status === "Cancelled" ? "This booking was cancelled (the payment time ran out). Please book the slot again." : `This booking is already ${booking.status.toLowerCase()}.` },
        { status: 409 }
      );
    }

    booking.paymentProofUrl = await storeProof(buf, img);
    booking.paymentMethod = method as any;
    booking.paymentReference = reference || undefined;
    booking.proofStatus = "submitted";
    booking.proofNote = undefined;
    booking.proofUploadedAt = new Date();
    booking.holdExpiresAt = new Date(Date.now() + PROOF_REVIEW_HOURS * 3600_000); // time for the club to review
    await booking.save();
    return NextResponse.json({ booking });
  } catch (e: any) {
    console.error("Proof upload failed:", e);
    return NextResponse.json({ error: e?.message || "Could not save your screenshot." }, { status: 500 });
  }
}
