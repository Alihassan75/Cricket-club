import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";
import { requireStaff } from "@/lib/guard";
import { getScope, customerIdsOf, arenaForCreate } from "@/lib/arenaScope";
import { syncCustomerProfiles } from "@/lib/portalCustomer";
import { zodMessage } from "@/lib/validation";

const createSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(7),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  await connectDB();
  await syncCustomerProfiles();
  const q = req.nextUrl.searchParams.get("q");
  const filter = q
    ? {
        $or: [
          { fullName: { $regex: q, $options: "i" } },
          { phone: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
        ],
      }
    : {};

  const ids = await customerIdsOf(await getScope(guard.auth));
  const customers = await Customer.find(ids === null ? filter : { $and: [filter, { _id: { $in: ids } }] }).sort({ createdAt: -1 });
  return NextResponse.json({ customers });
}

export async function POST(req: NextRequest) {
  const guard = requireStaff();
  if ("error" in guard) return guard.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) || "Invalid customer data." }, { status: 400 });
  }

  await connectDB();
  const existing = await Customer.findOne({ phone: parsed.data.phone });
  if (existing) {
    return NextResponse.json({ error: "A customer with this phone number already exists." }, { status: 409 });
  }

  const scope = await getScope(guard.auth);
  let arenas: string[] = [];
  if (!scope.all) {
    const target = arenaForCreate(scope);
    if ("error" in target) return target.error;
    arenas = [target.arenaId];
  }
  const customer = await Customer.create({ ...parsed.data, arenas });
  return NextResponse.json({ customer }, { status: 201 });
}
