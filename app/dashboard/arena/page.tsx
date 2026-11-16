"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import ArenaEditor from "@/components/ArenaEditor";
import { useRole } from "@/components/RoleContext";

/** "My arena page" — the arena manager edits what visitors see when they pick their arena. */
export default function MyArenaPage() {
  const role = useRole();
  const [arena, setArena] = useState<any | null | undefined>(undefined);
  useEffect(() => { fetch("/api/arenas/mine").then((r) => r.json().catch(() => ({}))).then((d) => setArena(d.arena || null)); }, []);

  return (
    <div className="p-5 max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display uppercase text-3xl leading-none">My arena page</h1>
          <p className="text-sm text-gray-500 mt-1">This is what players see when they pick your arena on the website.</p>
        </div>
        {arena && <Link href={`/arenas/${arena.slug}`} target="_blank" className="flex items-center gap-1.5 text-xs font-semibold border border-line bg-white px-3.5 py-2 rounded-full"><ExternalLink size={13} /> View my page</Link>}
      </div>
      {arena === undefined ? <div className="skeleton h-64" /> : arena === null ? (
        <div className="bg-white border border-line rounded-2xl p-8 text-sm text-gray-600">
          {role === "super_admin" ? <>Pick an arena in the “Working in” menu, or open <Link href="/dashboard/arenas" className="font-semibold text-ball">Arenas</Link>.</> : "Your account isn't linked to an arena yet."}
        </div>
      ) : <ArenaEditor arena={arena} isBackyard={role === "super_admin"} onSaved={setArena} />}
    </div>
  );
}
