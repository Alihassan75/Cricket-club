import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/guard";
import { PAYMENT_METHODS } from "@/models/Booking";
import CustomerMembership from "@/models/CustomerMembership";
import { getOrCreatePortalCustomer } from "@/lib/portalCustomer";
import { MAX_PROOF_BYTES, sniffImage, storeProof } from "@/lib/proofFiles";
import { rateLimit } from "@/lib/rateLimit";
import { notify } from "@/lib/notifications";

/** Customer uploads the payment screenshot for their own pending membership request. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireAuth();
  if ("error" in guard) return guard.error;
  const rl = rateLimit(`memproof:${guard.auth.userId}`, 10, 10 * 60_000);
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
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: "Membership request not found." }, { status: 404 });

  try {
    await connectDB();
    const customer = await getOrCreatePortalCustomer(guard.auth.userId);
    const membership: any = await CustomerMembership.findById(params.id).populate("plan");
    if (!membership || String(membership.customer) !== String(customer._id)) return NextResponse.json({ error: "Membership request not found." }, { status: 404 });
    if (membership.status !== "pending") return NextResponse.json({ error: "This request has already been handled." }, { status: 409 });

    membership.paymentProofUrl = await storeProof(buf, img);
    membership.paymentMethod = method;
    membership.paymentReference = reference || undefined;
    membership.proofUploadedAt = new Date();
    await membership.save();
    await notify("membership_request", "Membership payment screenshot", `${customer.fullName} sent a payment screenshot for the ${membership.plan?.packageName || "membership"} package.`);
    return NextResponse.json({ membership });
  } catch (e: any) {
    console.error("Membership proof failed:", e);
    return NextResponse.json({ error: e?.message || "Could not save your screenshot." }, { status: 500 });
  }
}
