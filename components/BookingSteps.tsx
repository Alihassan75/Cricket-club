import { Check } from "lucide-react";

const STEPS = ["Choose hour", "Sign up", "Pay", "Confirmed"];

/** Where the player is in the booking: 0-based `current`; everything before it shows as done. */
export default function BookingSteps({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-1 sm:gap-2 mb-6 overflow-x-auto">
      {STEPS.map((s, i) => {
        const done = i < current, on = i === current;
        return (
          <li key={s} className="flex items-center gap-1 sm:gap-2 shrink-0">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${done ? "bg-green text-white" : on ? "bg-pitch text-white ring-4 ring-green/25" : "bg-white border border-line text-gray-400"}`}>{done ? <Check size={14} /> : i + 1}</span>
            <span className={`text-xs font-semibold ${on ? "text-pitch" : done ? "text-green" : "text-gray-400"}`}>{s}</span>
            {i < STEPS.length - 1 && <span className={`w-6 sm:w-10 h-0.5 rounded ${done ? "bg-green" : "bg-line"}`} />}
          </li>
        );
      })}
    </ol>
  );
}
