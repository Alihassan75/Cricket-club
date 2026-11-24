type Item = { _id: string; customerName: string; startTime: string; endTime: string; status: string; ground?: { name: string } };
const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Today at a glance: one 24-hour lane per ground, with every booking drawn as a bar and a "now" marker. */
export default function TodayTimeline({ items }: { items: Item[] }) {
  const lanes = Array.from(new Set(items.map((i) => i.ground?.name || "Ground")));
  const now = new Date();
  const nowPct = ((now.getHours() * 60 + now.getMinutes()) / 1440) * 100;
  return (
    <div className="bg-white border border-line rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display uppercase text-xl">Today at a glance</h2>
        <div className="flex gap-3 text-[11px] font-semibold text-gray-500">
          <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded bg-green" /> Confirmed</span>
          <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded bg-amber-400" /> Pending</span>
        </div>
      </div>
      {lanes.length === 0 ? <p className="text-sm text-gray-500">Nothing booked today yet.</p> : (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[110px_1fr] gap-x-3 text-[10px] text-gray-400 mb-1">
              <span />
              <div className="relative h-4">{[0, 6, 12, 18, 24].map((h) => <span key={h} className="absolute -translate-x-1/2" style={{ left: `${(h / 24) * 100}%` }}>{String(h).padStart(2, "0")}:00</span>)}</div>
            </div>
            {lanes.map((l) => (
              <div key={l} className="grid grid-cols-[110px_1fr] gap-x-3 items-center mb-2">
                <span className="text-xs font-semibold truncate">{l}</span>
                <div className="relative h-9 rounded-lg bg-[#F4F6F5] border border-line overflow-hidden" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent 0 calc(100%/24 - 1px), rgba(0,0,0,0.05) calc(100%/24 - 1px) calc(100%/24))" }}>
                  {items.filter((i) => (i.ground?.name || "Ground") === l && i.status !== "Cancelled").map((i) => {
                    const s = m(i.startTime); let e = m(i.endTime); if (e <= s) e = 1440;
                    return <div key={i._id} title={`${i.customerName} · ${i.startTime}–${i.endTime}`} className={`absolute top-1 bottom-1 rounded-md px-1.5 text-[10px] font-semibold text-white flex items-center overflow-hidden whitespace-nowrap ${i.status === "Pending" ? "bg-amber-400 !text-black" : "bg-green"}`} style={{ left: `${(s / 1440) * 100}%`, width: `${((e - s) / 1440) * 100}%` }}>{i.customerName.split(" ")[0]}</div>;
                  })}
                  <div className="absolute top-0 bottom-0 w-0.5 bg-red-500" style={{ left: `${nowPct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
