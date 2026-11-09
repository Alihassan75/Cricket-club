import { redirect } from "next/navigation";
import { getAuthFromCookies } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import DashboardShell from "@/components/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const auth = getAuthFromCookies();
  if (!auth) redirect("/login");

  await connectDB();
  const user = await User.findById(auth.userId).select("name email role");
  if (!user) redirect("/login");

  return (
    <DashboardShell user={{ name: user.name, email: user.email, role: user.role }}>
      {children}
    </DashboardShell>
  );
}
