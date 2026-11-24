"use client";
import BrandLogo from "@/components/BrandLogo";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, CalendarCheck, CalendarDays, MapPin, Trophy, Users, Swords, Image as ImageIcon,
  UserRound, Wallet, Settings, Crown, Inbox, ShieldCheck, Building2, LogOut, Menu, PanelLeftClose, PanelLeftOpen, ExternalLink, ChevronDown,
} from "lucide-react";
import { ToastProvider } from "@/components/Toast";
import { RoleCtx } from "@/components/RoleContext";
import { ROLE_LABEL } from "@/lib/roles";

type NavItem = { href: string; label: string; icon: any; only?: string[] };
const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/dashboard/inquiries", label: "Play requests", icon: Inbox, only: ["super_admin"] },
  { href: "/dashboard/calendar", label: "Booking Calendar", icon: CalendarDays, only: ["arena_manager", "staff"] },
  { href: "/dashboard/grounds", label: "Grounds & slots", icon: MapPin, only: ["arena_manager", "staff"] },
  { href: "/dashboard/tournaments", label: "Tournaments", icon: Trophy },
  { href: "/dashboard/teams", label: "Teams", icon: Users, only: ["arena_manager", "staff"] },
  { href: "/dashboard/matches", label: "Matches", icon: Swords, only: ["arena_manager", "staff"] },
  { href: "/dashboard/gallery", label: "Gallery", icon: ImageIcon },
  { href: "/dashboard/customers", label: "Customers", icon: UserRound, only: ["arena_manager", "staff"] },
  { href: "/dashboard/clients", label: "Clients", icon: Crown, only: ["super_admin"] },
    { href: "/dashboard/payments", label: "Payments", icon: Wallet },
  { href: "/dashboard/arena", label: "My arena page", icon: Building2, only: ["arena_manager", "staff"] },
  { href: "/dashboard/arenas", label: "Arenas", icon: Building2, only: ["super_admin"] },
  { href: "/dashboard/managers", label: "Managers", icon: ShieldCheck, only: ["super_admin"] },
  { href: "/dashboard/settings", label: "Website settings", icon: Settings, only: ["super_admin"] },
];
// Hidden from the menu (pages still exist): staff, equipment,
// maintenance, expenses, reports, coupons, search, notifications.

export default function DashboardShell({
  user,
  arena,
  arenas = [],
  scopeId = "",
  children,
}: {
  user: { name: string; email: string; role: string };
  arena?: { name: string; slug: string } | null; // the arena an arena manager works for
  arenas?: { _id: string; name: string }[]; // Backyard Manager: arenas to pick from
  scopeId?: string; // Backyard Manager: the arena currently being viewed ("" = all)
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [newInquiries, setNewInquiries] = useState(0);
  const items = NAV.filter((n) => !n.only || n.only.includes(user.role));

  useEffect(() => {
    let alive = true;
    const poll = () => fetch("/api/inquiries/summary").then((r) => (r.ok ? r.json() : null)).then((d) => alive && d && setNewInquiries(d.new || 0)).catch(() => {});
    poll();
    const t = setInterval(poll, 45000);
    return () => { alive = false; clearInterval(t); };
  }, [pathname]);

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

  const pickArena = async (arenaId: string) => {
    await fetch("/api/arena-scope", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ arenaId }) });
    window.location.reload(); // every page re-loads with the new arena
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login"); // full reload clears cached pages of this account
  };

  const isActive = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
  const current = items.find((n) => isActive(n.href))?.label ?? "Dashboard";
  const initials = user.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <ToastProvider>
      <RoleCtx.Provider value={user.role}>
      <div className="app-shell flex min-h-screen bg-[#F4F6F5]">
        {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />}
        <aside
          className={`fixed md:sticky md:top-0 md:h-screen z-50 top-0 left-0 h-full flex flex-col bg-white border-r border-line transition-all duration-300 ${
            collapsed ? "md:w-[76px]" : "md:w-[250px]"
          } w-[250px] ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        >
          <div className={`flex items-center gap-2.5 pt-5 pb-4 ${collapsed ? "md:justify-center md:px-0 px-5" : "px-5"}`}>
            <BrandLogo size={38} tone="light" />
            <Link href="/" className={`font-display uppercase tracking-wide text-pitch text-lg leading-none ${collapsed ? "md:hidden" : ""}`}>
              {arena ? arena.name : <>Backyard <span className="text-green">CC</span></>}
            </Link>
          </div>
          {user.role === "super_admin" && arenas.length > 0 && (
            <div className={`px-3 pb-3 ${collapsed ? "md:hidden" : ""}`}>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 px-1">Working in</label>
              <select value={scopeId} onChange={(e) => pickArena(e.target.value)} className="w-full rounded-lg bg-cream text-pitch text-xs font-semibold px-2.5 py-2 border border-line outline-none">
                <option value="" className="text-black">All arenas</option>
                {arenas.map((a) => <option key={a._id} value={a._id} className="text-black">{a.name}</option>)}
              </select>
            </div>
          )}
          <nav className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-1">
            {items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  onClick={() => setMobileOpen(false)}
                  className={`nav-item group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium relative transition-all ${
                    active ? "bg-green text-white shadow-md shadow-green/25" : "text-gray-600 hover:text-pitch hover:bg-cream hover:translate-x-0.5"
                  } ${collapsed ? "md:justify-center" : ""}`}
                >
                  <Icon size={18} className="shrink-0" />
                  <span className={collapsed ? "md:hidden" : ""}>{item.label}</span>
                  {item.href === "/dashboard/inquiries" && newInquiries > 0 && (
                    <span className={`ml-auto min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center ${active ? "bg-white text-green" : "bg-green text-white"} ${collapsed ? "md:absolute md:top-0.5 md:right-0.5 md:ml-0 md:min-w-[16px] md:h-4 md:text-[9px]" : ""}`}>{newInquiries > 99 ? "99+" : newInquiries}</span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="px-3 pb-4 pt-2 border-t border-line flex flex-col gap-1">
            <button onClick={toggleCollapsed} className="hidden md:flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] text-gray-500 hover:text-pitch hover:bg-cream">
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              <span className={collapsed ? "hidden" : ""}>Collapse</span>
            </button>
            <button onClick={logout} title="Logout" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] text-gray-500 hover:text-red-600 hover:bg-red-50 ${collapsed ? "md:justify-center" : ""}`}>
              <LogOut size={18} className="shrink-0" />
              <span className={collapsed ? "md:hidden" : ""}>Logout</span>
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          <header className="sticky top-0 z-30 flex items-center gap-3 px-5 py-3 bg-white/90 backdrop-blur border-b border-line shadow-[0_1px_0_rgba(0,0,0,0.02)]">
            <button className="md:hidden p-1.5 rounded-lg hover:bg-black/5" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu size={20} />
            </button>
            <div>
              <div className="font-display uppercase text-xl leading-none">{current}</div>
              <div className="text-[11px] text-gray-500 mt-0.5 hidden sm:block">{today}</div>
            </div>
            <div className="flex-1" />
            <span className={`hidden md:inline-block text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full ${user.role === "super_admin" ? "bg-ball text-white" : "bg-green/10 text-green"}`}>{arena ? `${arena.name} · ` : ""}{ROLE_LABEL[user.role] || user.role}</span>
            <Link href={arena ? `/arenas/${arena.slug}` : "/"} target="_blank" className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-pitch border border-line bg-white px-3 py-2 rounded-full hover:shadow-md transition">
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
                      <div className="text-[11px] text-ball font-semibold mt-0.5">{ROLE_LABEL[user.role] || user.role}</div>
                    </div>
                    <button onClick={logout} className="w-full text-left text-sm px-3 py-2 rounded-xl hover:bg-red-50 text-red-600 font-semibold flex items-center gap-2">
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
      </RoleCtx.Provider>
    </ToastProvider>
  );
}
