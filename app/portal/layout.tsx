import { redirect } from "next/navigation";
import { getAuthFromCookies } from "@/lib/auth";
import PortalShell from "@/components/PortalShell";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const auth = getAuthFromCookies();
  if (!auth) redirect("/login");

  return <PortalShell email={auth.email}>{children}</PortalShell>;
}
