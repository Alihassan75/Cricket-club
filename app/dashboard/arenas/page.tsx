"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, X, ExternalLink, Pencil, LayoutDashboard } from "lucide-react";
import { useToast } from "@/components/Toast";
import ArenaEditor from "@/components/ArenaEditor";

/** Backyard Manager: every arena on the website. Add one, edit its page, jump into its dashboard. */
export default function ArenasPage() {
  const toast = useToast();
  const [list, setList] = useState<any[] | null>(null);
  const [edit, setEdit] = useState<any | null>(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: "", city: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/arenas");
    const data = await res.json().catch(() => ({}));
    setList(res.ok ? data.arenas || [] : []);
    if (!res.ok) toast(data.error || "Could not load arenas.", "error");
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    setError("");
    if (f.name.trim().length < 2) return setError("Please enter the arena's name, like “Pasha Arena”.");
    setBusy(true);
    const res = await fetch("/api/arenas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: f.name.trim(), city: f.city.trim() || undefined }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || `Could not add (${res.status}).`);
    setAdding(false); setF({ name: "", city: "" });
    toast(`${data.arena.name} added. Now add its manager under Managers.`);
    await load();
    setEdit(data.arena);
  };

  const open = async (id: string) => {
    await fetch("/api/arena-scope", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ arenaId: id }) });
    window.location.href = "/dashboard";
  };

  return (
    <div className="p-5 max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display uppercase text-3xl leading-none">Arenas</h1>
          <p className="text-sm text-gray-500 mt-1">Each arena gets its own page on the website. Its manager runs bookings, grounds, slots and tournaments for that arena only.</p>
        </div>
        <button onClick={() => { setAdding(true); setError(""); }} className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-green"><Plus size={16} /> Add arena</button>
      </div>

      {list === null ? <div className="grid gap-3">{[0, 1].map((i) => <div key={i} className="skeleton h-28" />)}</div> : list.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl p-10 text-center text-sm text-gray-500">No arenas yet — add your first one.</div>
      ) : (
        <div className="grid gap-3">
          {list.map((a) => (
            <div key={a._id} className="bg-white border border-line rounded-2xl p-4 flex flex-wrap items-center gap-4">
              {a.coverImage ? <img src={a.coverImage} alt="" className="w-24 h-16 rounded-xl object-cover" /> : <div className="w-24 h-16 rounded-xl bg-pitch/90 text-gold flex items-center justify-center font-display text-2xl">{a.name[0]}</div>}
              <div className="flex-1 min-w-[200px]">
                <div className="font-bold">{a.name} {a.status === "hidden" && <span className="text-[10px] font-bold bg-gray-200 text-gray-600 rounded-full px-2 py-0.5 ml-1">hidden</span>}</div>
                <div className="text-xs text-gray-500">/arenas/{a.slug} · {a.groundCount} ground{a.groundCount === 1 ? "" : "s"}{a.city ? ` · ${a.city}` : ""}</div>
                <div className="text-xs mt-1">{a.managers?.length ? <>Run by <b>{a.managers.map((m: any) => m.name).join(", ")}</b></> : <span className="text-ball font-semibold">No manager yet — add one under Managers</span>}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => open(a._id)} className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full bg-pitch text-white"><LayoutDashboard size={13} /> Manage</button>
                <button onClick={() => setEdit(a)} className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full border border-line"><Pencil size={13} /> Edit page</button>
                <Link href={`/arenas/${a.slug}`} target="_blank" className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full border border-line"><ExternalLink size={13} /> View</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setAdding(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-lg">Add an arena</h2><button onClick={() => setAdding(false)} aria-label="Close" className="w-8 h-8 rounded-full bg-cream flex items-center justify-center"><X size={16} /></button></div>
            {error && <div role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>}
            <div className="flex flex-col gap-3">
              <label className="text-xs text-gray-500">Arena name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Pasha Arena" className="field !py-2.5 mt-0.5" /></label>
              <label className="text-xs text-gray-500">City (optional)<input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} className="field !py-2.5 mt-0.5" /></label>
            </div>
            <div className="flex justify-end gap-2 mt-5"><button onClick={() => setAdding(false)} className="px-4 py-2 text-sm font-semibold text-gray-500">Cancel</button><button onClick={add} disabled={busy} className="px-5 py-2 text-sm font-semibold text-white bg-green rounded-lg disabled:opacity-60">{busy ? "Adding…" : "Add arena"}</button></div>
          </div>
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto p-4" onClick={() => setEdit(null)}>
          <div className="bg-cream rounded-2xl w-full max-w-3xl mx-auto my-6 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="font-display uppercase text-2xl">{edit.name}</h2><button onClick={() => setEdit(null)} aria-label="Close" className="w-8 h-8 rounded-full bg-white flex items-center justify-center"><X size={16} /></button></div>
            <ArenaEditor arena={edit} isBackyard onSaved={() => { load(); }} />
          </div>
        </div>
      )}
    </div>
  );
}
