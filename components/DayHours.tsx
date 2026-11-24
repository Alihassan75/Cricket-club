import { Clock, Check } from "lucide-react";

export type HourCell = { booking?: { id: string; customer: string; start: string; end: string }; hour: number; start: string; end: string; status: "booked" | "empty" | "maintenance" | "closed" };

/**
 * The day's hours as cards. Only the hours the admin has opened are shown — closed hours get no card.
 * Booked hours are filled, empty hours carry a green "Available" marker.
 * Pass `onPick` to make empty hours tappable and `onEditBooked` to make booked hours tappable.
 */
export default function DayHours({
  hours, title = "Hours", loading = false, dark = false, onPick, onEditBooked, pickedHour = null, disabledHours = [], selectedHours = [],
}: {
  hours: HourCell[]; title?: string; loading?: boolean; dark?: boolean;
  onPick?: (h: HourCell) => void; onEditBooked?: (h: HourCell) => void; pickedHour?: number | null; disabledHours?: number[]; selectedHours?: number[];
}) {
  const shown = hours.filter((h) => h.status !== "closed"); // no card for hours the admin hasn't opened
  const booked = shown.filter((h) => h.status === "booked").length;
  const empty = shown.filter((h) => h.status === "empty" && !disabledHours.includes(h.hour)).length;
  const shell = dark ? "bg-white/[0.04] border-white/10 text-white" : "bg-white border-line";
  const muted = dark ? "text-white/60" : "text-gray-500";
  return (
    <section className={`border rounded-3xl p-4 sm:p-5 ${shell}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="font-display uppercase text-lg flex items-center gap-2"><Clock size={16} /> {title}</h2>
        {!loading && shown.length > 0 && (
          <div className={`flex items-center gap-4 text-[11px] font-semibold ${muted}`}>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green" /> Available · {empty}</span>
            <span className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${dark ? "bg-white" : "bg-pitch"}`} /> Booked · {booked}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className={`h-[72px] rounded-2xl ${dark ? "bg-white/10 animate-pulse" : "skeleton"}`} />)}</div>
      ) : shown.length === 0 ? (
        <p className={`text-sm ${muted}`}>No hours are open on this day.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {shown.map((h) => {
            const b = h.status === "booked";
            const m = h.status === "maintenance";
            const past = disabledHours.includes(h.hour);
            const picked = pickedHour === h.hour || selectedHours.includes(h.hour);
            const editable = !!onEditBooked && b && !!h.booking;
            const tappable = !!onPick && h.status === "empty" && !past && pickedHour === null && !picked;

            const base = "relative overflow-hidden rounded-2xl pl-4 pr-3 py-3 text-left border transition-all duration-200";
            const look = picked
              ? "hour-picked bg-green text-white border-green"
              : b
              ? dark ? "bg-white text-pitch border-white" : "bg-pitch text-white border-pitch"
              : m || past
              ? dark ? "border-white/10 text-white/30" : "bg-gray-50 text-gray-400 border-line"
              : `${dark ? "bg-white/[0.05] border-white/15 text-white" : "bg-white border-line text-pitch"} ${tappable ? `hour-tap cursor-pointer ${dark ? "hover:bg-green/25 hover:border-green" : "hover:border-green hover:shadow-lg hover:shadow-green/15"}` : ""}`;
            const bar = picked ? "bg-white" : b ? "bg-red-500" : m || past ? "bg-gray-300" : "bg-green";
            const label = picked ? "Selected" : b ? (editable ? `${h.booking!.customer.split(" ")[0] || "Booked"} · edit` : "Booked") : m ? "Maintenance" : past ? "Passed" : "Available";

            const inner = (
              <>
                <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${bar}`} />
                <div className="font-display text-[22px] leading-none tabular-nums flex items-center justify-between gap-1">
                  {h.start}
                  {picked && <Check size={16} className="hour-check" />}
                </div>
                <div className="text-[11px] tabular-nums opacity-60 mt-1">to {h.end}</div>
                <div className={`text-[10px] font-bold uppercase tracking-wider mt-1.5 ${picked ? "opacity-90" : b ? "opacity-80" : m || past ? "opacity-70" : "text-green"}`}>{label}</div>
              </>
            );
            if (editable) return <button key={h.hour} type="button" onClick={() => onEditBooked!(h)} className={`${base} ${look} cursor-pointer hover:-translate-y-0.5 hover:brightness-110`}>{inner}</button>;
            return tappable ? (
              <button key={h.hour} type="button" onClick={() => onPick!(h)} className={`${base} ${look}`}>{inner}</button>
            ) : (
              <div key={h.hour} className={`${base} ${look}`}>{inner}</div>
            );
          })}
        </div>
      )}
    </section>
  );
}
