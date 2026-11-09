"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, MapPin, Calendar, CreditCard, Trophy, User, LogOut } from "lucide-react";
import { ToastProvider } from "@/components/Toast";

const NAV = [
  { href: "/portal", label: "Overview", icon: LayoutDashboard },
  { href: "/portal/grounds", label: "Grounds", icon: MapPin },
  { href: "/portal/bookings", label: "My Bookings", icon: Calendar },
  { href: "/portal/membership", label: "Membership", icon: CreditCard },
  { href: "/portal/tournaments", label: "Tournaments", icon: Trophy },
  { href: "/portal/profile", label: "Profile", icon: User },
];

export default function PortalShell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <ToastProvider>
      <div className="app-shell min-h-screen bg-cream">
        <header className="bg-pitch text-white sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2 font-display uppercase tracking-wide text-[15px] sm:text-lg whitespace-nowrap min-w-0">
              <span className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 rounded-full bg-ball ring-2 ring-white/25" />
              Backyard Cricket Club
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-white/60 hidden sm:inline">{email}</span>
              <button onClick={logout} className="flex items-center gap-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-ball px-3 py-1.5 rounded-full">
                <LogOut size={14} /> Logout
              </button>
            </div>
          </div>
          <nav className="max-w-5xl mx-auto px-5 flex gap-1 overflow-x-auto">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium border-b-[3px] whitespace-nowrap transition-colors ${
                    active ? "border-gold text-white" : "border-transparent text-white/60 hover:text-white hover:border-white/30"
                  }`}
                >
                  <Icon size={14} /> {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="max-w-5xl mx-auto p-5">
          <div key={pathname} className="fade-up">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
