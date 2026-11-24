import { socialUrl } from "@/lib/social";
import PlayForm from "@/components/PlayForm";
import { getSiteSettings } from "@/lib/site";
import { PLAY_TIME, PLAY_DAY_LABEL } from "@/lib/playRules";
import { Phone, CalendarCheck, Trophy, Send } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Play with us — Backyard Cricket Club", description: "Join our weekly Saturday 8 AM game — send a request and our team will confirm your slot." };

export default async function PlayPage() {
  const settings = await getSiteSettings();
  const fee = Number(settings.playRegistrationFee ?? 500) || 0;
  const paymentInstructions = settings.paymentInstructions || "";
  const contactPhone = settings.whatsapp || settings.phone || "";

  return (
    <div className="max-w-6xl mx-auto px-5 py-10 md:py-14 grid lg:grid-cols-5 gap-8 lg:gap-10 items-start">
      <div className="lg:col-span-2 bg-pitch text-white rounded-3xl p-7 sm:p-9 lg:sticky lg:top-24 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-ball/80" />
        <div className="relative">
          <div className="text-xs font-bold uppercase tracking-widest text-gold">Backyard Cricket Club</div>
          <h1 className="font-display uppercase text-[44px] sm:text-5xl leading-[0.98] mt-3">Want to play <span className="text-gold">with us?</span></h1>
          <p className="text-white/70 mt-4">Thousands of cricket fans follow us on Instagram and Facebook — and many ask how to join a game. We play every {PLAY_DAY_LABEL} at {PLAY_TIME}. Fill in the form and we'll set it up.</p>
          <ol className="mt-7 flex flex-col gap-4 text-sm">
            {[[Send, "Send your request", `Your name, phone, email and which ${PLAY_DAY_LABEL} you want (${PLAY_TIME}).`], [Phone, "We call or WhatsApp you", "Usually within a day, to confirm your spot once we have checked your payment."], [CalendarCheck, "Show up and play", "Everything is confirmed with you before you arrive."]].map(([Icon, t, s]: any, i) => (
              <li key={i} className="flex gap-3"><span className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0"><Icon size={16} className="text-gold" /></span><span><b className="block">{t}</b><span className="text-white/60">{s}</span></span></li>
            ))}
          </ol>
          <div className="mt-7 pt-5 border-t border-white/15 flex flex-wrap gap-3 text-sm">
            {socialUrl(settings.socialLinks?.instagram, "instagram") && <a href={socialUrl(settings.socialLinks?.instagram, "instagram")} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Instagram</a>}
            {socialUrl(settings.socialLinks?.facebook, "facebook") && <a href={socialUrl(settings.socialLinks?.facebook, "facebook")} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Facebook</a>}
            <a href="/tournaments" className="flex items-center gap-1 text-gold"><Trophy size={14} /> See tournaments</a>
          </div>
        </div>
      </div>
      <div className="lg:col-span-3 relative">
        <PlayForm fee={fee} currency={settings.currency} social={settings.socialLinks} paymentInstructions={paymentInstructions} contactPhone={contactPhone} />
      </div>
    </div>
  );
}


