"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, CalendarCheck, CalendarDays, MapPin, Trophy, Users, Swords, Image as ImageIcon,
  UserRound, Wallet, Settings, Crown, LogOut, Menu, PanelLeftClose, PanelLeftOpen, ExternalLink, ChevronDown,
} from "lucide-react";
import { ToastProvider } from "@/components/Toast";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/dashboard/calendar", label: "Booking Calendar", icon: CalendarDays },
  { href: "/dashboard/grounds", label: "Grounds", icon: MapPin },
  { href: "/dashboard/tournaments", label: "Tournaments", icon: Trophy },
  { href: "/dashboard/teams", label: "Teams", icon: Users },
  { href: "/dashboard/matches", label: "Matches", icon: Swords },
  { href: "/dashboard/gallery", label: "Gallery", icon: ImageIcon },
  { href: "/dashboard/customers", label: "Customers", icon: UserRound },
  { href: "/dashboard/memberships", label: "Memberships", icon: Crown },
  { href: "/dashboard/payments", label: "Payments", icon: Wallet },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];
// Hidden from the menu (pages still exist): staff, equipment,
// maintenance, expenses, reports, coupons, search, notifications.

export default function DashboardShell({
  user,
  children,
}: {
  user: { name: string; email: string; role: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("bcc-sidebar") === "1");
    } catch {}
  }, []);
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem("bcc-sidebar", c ? "0" : "1");
      } catch {}
      return !c;
    });
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const isActive = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
  const current = NAV.find((n) => isActive(n.href))?.label ?? "Dashboard";
  const initials = user.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <ToastProvider>
      <div className="app-shell flex min-h-screen bg-cream">
        {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />}
        <aside
          className={`fixed md:sticky md:top-0 md:h-screen z-50 top-0 left-0 h-full flex flex-col bg-pitch transition-all duration-300 ${
            collapsed ? "md:w-[76px]" : "md:w-[250px]"
          } w-[250px] ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        >
          <div className={`flex items-center gap-2.5 pt-5 pb-4 ${collapsed ? "md:justify-center md:px-0 px-5" : "px-5"}`}>
            <span className="w-6 h-6 shrink-0 rounded-full bg-ball ring-2 ring-white/25" />
            <Link href="/" className={`font-display uppercase tracking-wide text-white text-lg leading-none ${collapsed ? "md:hidden" : ""}`}>
              Backyard <span className="text-gold">CC</span>
            </Link>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  onClick={() => setMobileOpen(false)}
                  className={`nav-item group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium relative transition-all ${
                    active ? "bg-gold text-pitch shadow-lg" : "text-white/60 hover:text-white hover:bg-white/10 hover:translate-x-0.5"
                  } ${collapsed ? "md:justify-center" : ""}`}
                >
                  <Icon size={18} className="shrink-0" />
                  <span className={collapsed ? "md:hidden" : ""}>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="px-3 pb-4 pt-2 border-t border-white/10 flex flex-col gap-1">
            <button onClick={toggleCollapsed} className="hidden md:flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] text-white/60 hover:text-white hover:bg-white/10">
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              <span className={collapsed ? "hidden" : ""}>Collapse</span>
            </button>
            <button onClick={logout} title="Logout" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] text-white/60 hover:text-white hover:bg-ball/80 ${collapsed ? "md:justify-center" : ""}`}>
              <LogOut size={18} className="shrink-0" />
              <span className={collapsed ? "md:hidden" : ""}>Logout</span>
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          <header className="sticky top-0 z-30 flex items-center gap-3 px-5 py-3 bg-cream/85 backdrop-blur border-b border-line">
            <button className="md:hidden p-1.5 rounded-lg hover:bg-black/5" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu size={20} />
            </button>
            <div>
              <div className="font-display uppercase text-xl leading-none">{current}</div>
              <div className="text-[11px] text-gray-500 mt-0.5 hidden sm:block">{today}</div>
            </div>
            <div className="flex-1" />
            <Link href="/" target="_blank" className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-pitch border border-line bg-white px-3 py-2 rounded-full hover:shadow-md transition">
              <ExternalLink size={13} /> View website
            </Link>
            <div className="relative">
              <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 bg-white border border-line rounded-full pl-1.5 pr-3 py-1.5 hover:shadow-md transition">
                <span className="w-7 h-7 rounded-full bg-ball text-white text-xs font-bold flex items-center justify-center">{initials}</span>
                <span className="text-sm font-semibold hidden sm:block">{user.name.split(" ")[0]}</span>
                <ChevronDown size={14} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="pop-in absolute right-0 mt-2 w-56 bg-white border border-line rounded-2xl shadow-xl z-50 p-2">
                    <div className="px-3 py-2">
                      <div className="text-sm font-semibold">{user.name}</div>
                      <div className="text-xs text-gray-500 truncate">{user.email}</div>
                      <div className="text-[11px] text-ball font-semibold capitalize mt-0.5">{user.role.replace("_", " ")}</div>
                    </div>
                    <button onClick={logout} className="w-full text-left text-sm px-3 py-2 rounded-xl hover:bg-ball/10 text-ball font-semibold flex items-center gap-2">
                      <LogOut size={14} /> Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </header>
          <main className="flex-1 min-w-0">
            <div key={pathname} className="fade-up">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
