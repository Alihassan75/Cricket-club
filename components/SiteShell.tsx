import Link from "next/link";
import { socialUrl } from "@/lib/social";
import BrandLogo from "@/components/BrandLogo";
import { Facebook, Instagram, Twitter, Home, MapPin, Trophy, User } from "lucide-react";

type Settings = {
  arenaName: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  announcement?: string;
  announcementOn?: boolean;
  announcementLink?: string;
  socialLinks?: { facebook?: string; instagram?: string; twitter?: string };
};

const LINKS = [
  { href: "/arenas", label: "Arenas" },
  { href: "/play", label: "Play with us" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/gallery", label: "Gallery" },
];

export default function SiteShell({ settings, children }: { settings: Settings; children: React.ReactNode }) {
  const wa = settings.whatsapp?.replace(/\D/g, "");
  return (
    <div className="min-h-screen flex flex-col bg-cream text-[#0A0A0A]">
      {settings.announcementOn && settings.announcement && (
        <div className="bg-ball text-white text-center text-sm font-semibold px-4 py-2">
          {settings.announcementLink ? <a href={settings.announcementLink} className="underline underline-offset-4">{settings.announcement}</a> : settings.announcement}
        </div>
      )}
      <header className="bg-pitch sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 md:px-5 h-16 flex items-center gap-2.5 md:gap-5">
          <Link href="/" className="font-display uppercase tracking-wide text-white text-[15px] sm:text-lg lg:text-[22px] whitespace-nowrap flex items-center gap-2 flex-1 md:flex-none min-w-0">
            <BrandLogo size={44} />
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
        </div>
        <nav className="md:hidden flex gap-5 px-5 pb-3 text-xs text-white/70 overflow-x-auto">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}>{l.label}</Link>
          ))}
        </nav>
      </header>
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-pitch/95 backdrop-blur border-t border-white/10 grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
        {[["/", "Home", Home], ["/arenas", "Arenas", MapPin], ["/tournaments", "Tournaments", Trophy], ["/portal", "Account", User]].map(([href, label, Icon]: any) => (
          <Link key={href} href={href} className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold text-white/70 hover:text-greenBright"><Icon size={19} />{label}</Link>
        ))}
      </nav>
      <footer className="bg-pitch text-white/65 text-sm relative overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-green via-greenBright to-green" />
        <div className="max-w-6xl mx-auto px-5 pt-14 pb-10 grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3 mb-4">
              <BrandLogo size={56} />
              <div className="font-display uppercase text-white text-2xl leading-none">{settings.arenaName}<div className="text-[10px] tracking-[0.35em] text-white/40 font-sans mt-1.5">PAKISTAN</div></div>
            </div>
            <p className="max-w-sm leading-relaxed text-white/55">Book a ground by the hour, join tournaments and relive every six, wicket and trophy lift with the club.</p>
            {wa && <a href={`https://wa.me/${wa}`} className="inline-flex items-center gap-2 mt-5 bg-ball text-white font-semibold px-5 py-2.5 rounded-full hover:brightness-110 transition">WhatsApp us</a>}
          </div>
          <div className="md:col-span-3">
            <div className="text-white font-bold text-xs uppercase tracking-[0.2em] mb-4">Explore</div>
            <ul className="space-y-2.5">
              {LINKS.map((l) => <li key={l.href}><Link href={l.href} className="hover:text-greenBright transition">{l.label}</Link></li>)}
              <li><Link href="/login" className="hover:text-greenBright transition">Sign in</Link></li>
              <li><Link href="/register" className="hover:text-greenBright transition">Create account</Link></li>
            </ul>
          </div>
          <div className="md:col-span-4">
            <div className="text-white font-bold text-xs uppercase tracking-[0.2em] mb-4">Get in touch</div>
            <ul className="space-y-2.5">
              {settings.address && <li>{settings.address}</li>}
              {settings.phone && <li><a href={`tel:${settings.phone}`} className="hover:text-greenBright transition">{settings.phone}</a></li>}
              {settings.email && <li><a href={`mailto:${settings.email}`} className="hover:text-greenBright transition break-all">{settings.email}</a></li>}
            </ul>
            <div className="flex gap-2.5 mt-5">
              {socialUrl(settings.socialLinks?.facebook, "facebook") && <a href={socialUrl(settings.socialLinks?.facebook, "facebook")} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-ball hover:border-ball hover:text-white transition"><Facebook size={17} /></a>}
              {socialUrl(settings.socialLinks?.instagram, "instagram") && <a href={socialUrl(settings.socialLinks?.instagram, "instagram")} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-ball hover:border-ball hover:text-white transition"><Instagram size={17} /></a>}
              {socialUrl(settings.socialLinks?.twitter, "twitter") && <a href={socialUrl(settings.socialLinks?.twitter, "twitter")} target="_blank" rel="noopener noreferrer" aria-label="Twitter / X" className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-ball hover:border-ball hover:text-white transition"><Twitter size={17} /></a>}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-6xl mx-auto px-5 py-5 flex flex-col sm:flex-row gap-2 justify-between text-xs text-white/40">
            <span>© {new Date().getFullYear()} {settings.arenaName}. All rights reserved.</span>
            <span className="tracking-[0.3em] uppercase">Book · Play · Win</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
