import BrandLogo from "@/components/BrandLogo";
import CricketBall from "@/components/CricketBall";

export default function AuthShell({ children, tagline }: { children: React.ReactNode; tagline: string }) {
  return (
    <div className="min-h-screen w-full flex bg-cream">
      <div className="hidden md:flex md:w-[46%] flex-col justify-between p-10 bg-pitch relative overflow-hidden">
        <div className="absolute inset-y-0 right-[-60px] w-[55%] -skew-x-[8deg] opacity-[0.05]" style={{ background: "repeating-linear-gradient(100deg,#fff 0 46px,transparent 46px 92px)" }} />
        <div className="flex items-center gap-2.5 relative">
          <BrandLogo size={56} />
          <span className="font-display uppercase tracking-wide text-white text-xl">Backyard Cricket Club</span>
        </div>
        <div className="relative">
          <h1 className="font-display uppercase text-white text-5xl leading-[1.02] mb-4">
            Run the ground<br />like a captain<br />runs an <span className="text-gold">innings.</span>
          </h1>
          <p className="text-white/65 text-[15px] max-w-sm">{tagline}</p>
        </div>
        <div className="relative flex justify-end items-end">
          <div className="absolute right-3 bottom-0 w-32 h-5 rounded-full bg-black/60 blur-md" />
          <CricketBall size={130} className="relative mr-2 mb-3" />
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm fade-up">{children}</div>
      </div>
    </div>
  );
}
