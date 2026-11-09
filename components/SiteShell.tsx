import Link from "next/link";

type Settings = {
  arenaName: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  socialLinks?: { facebook?: string; instagram?: string; twitter?: string };
};

const LINKS = [
  { href: "/tournaments", label: "Tournaments" },
  { href: "/gallery", label: "Gallery" },
  { href: "/grounds", label: "Book Ground" },
];

export default function SiteShell({ settings, children }: { settings: Settings; children: React.ReactNode }) {
  const wa = settings.whatsapp?.replace(/\D/g, "");
  return (
    <div className="min-h-screen flex flex-col bg-cream text-[#14201A]">
      <header className="bg-pitch sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 md:px-5 h-16 flex items-center gap-2.5 md:gap-5">
          <Link href="/" className="font-display uppercase tracking-wide text-white text-[15px] sm:text-lg lg:text-[22px] whitespace-nowrap flex items-center gap-2 flex-1 md:flex-none min-w-0">
            <span className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 rounded-full bg-ball ring-2 ring-white/25" />
            {settings.arenaName}
          </Link>
          <nav className="hidden md:flex gap-4 lg:gap-6 flex-1 text-sm text-white/70">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-white">
                {l.label}
              </Link>
            ))}
          </nav>
          <Link href="/login" className="hidden lg:inline text-sm text-white/70 hover:text-white">Sign in</Link>
          <Link href="/portal/book" className="bg-ball text-white text-sm font-semibold px-3.5 md:px-5 py-2 md:py-2.5 rounded-full whitespace-nowrap shrink-0">Book Now</Link>
        </div>
        <nav className="md:hidden flex gap-5 px-5 pb-3 text-xs text-white/70 overflow-x-auto">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}>{l.label}</Link>
          ))}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-pitch text-white/65 text-sm">
        <div className="max-w-6xl mx-auto px-5 py-10 grid gap-6 md:grid-cols-3">
          <div>
            <div className="font-display uppercase text-white text-xl mb-2">{settings.arenaName}</div>
            {settings.address && <div>{settings.address}</div>}
          </div>
          <div className="space-y-1">
            {settings.phone && <div>Call: {settings.phone}</div>}
            {settings.email && <div>Email: {settings.email}</div>}
            {wa && <a href={`https://wa.me/${wa}`} className="text-gold block">WhatsApp us</a>}
          </div>
          <div className="space-y-1">
            {settings.socialLinks?.facebook && <a href={settings.socialLinks.facebook} className="block">Facebook</a>}
            {settings.socialLinks?.instagram && <a href={settings.socialLinks.instagram} className="block">Instagram</a>}
            {settings.socialLinks?.twitter && <a href={settings.socialLinks.twitter} className="block">Twitter / X</a>}
          </div>
        </div>
      </footer>
    </div>
  );
}
