"use client";
import { useEffect } from "react";
import { takeNext } from "@/lib/postLogin";
import BrandLogo from "@/components/BrandLogo";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, MapPin, Calendar, CreditCard, Trophy, User, LogOut } from "lucide-react";
import { ToastProvider } from "@/components/Toast";

const NAV = [
  { href: "/portal", label: "Overview", icon: LayoutDashboard },
  { href: "/arenas", label: "Arenas", icon: MapPin },
  { href: "/portal/bookings", label: "My Bookings", icon: Calendar },
  { href: "/portal/membership", label: "Membership", icon: CreditCard },
  { href: "/portal/tournaments", label: "Tournaments", icon: Trophy },
  { href: "/portal/profile", label: "Profile", icon: User },
];

export default function PortalShell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (pathname === "/portal") { const n = takeNext(); if (n) router.replace(n); }
  }, [pathname, router]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  };

  return (
    <ToastProvider>
      <div className="app-shell min-h-screen bg-cream">
        <header className="bg-pitch text-white sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2 font-display uppercase tracking-wide text-[15px] sm:text-lg whitespace-nowrap min-w-0">
              <BrandLogo size={40} />
              Backyard Cricket Club
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-white/60 hidden sm:inline">{email}</span>
              <button onClick={logout} className="flex items-center gap-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/25 px-3 py-1.5 rounded-full">
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
        <main className="max-w-5xl mx-auto p-5 pb-24 md:pb-5">
          <div key={pathname} className="fade-up">{children}</div>
        </main>
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-line grid grid-cols-4 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_rgba(0,0,0,0.06)]">
          {[NAV[0], NAV[1], NAV[2], NAV[5]].map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold ${active ? "text-green" : "text-gray-500"}`}>
                <span className={`w-10 h-6 rounded-full flex items-center justify-center transition ${active ? "bg-green/15" : ""}`}><Icon size={18} /></span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </ToastProvider>
  );
}
