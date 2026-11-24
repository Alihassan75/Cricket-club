"use client";
import { useState } from "react";
import Link from "next/link";

type Results = {
  bookings: any[];
  customers: any[];
  teams: any[];
  grounds: any[];
  payments: any[];
};

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async () => {
    if (q.trim().length < 2) return;
    setLoading(true);
    setError("");
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Search failed.");
      return;
    }
    setResults(data);
  };

  const Section = ({ title, count, children }: { title: string; count: number; children: React.ReactNode }) =>
    count === 0 ? null : (
      <div className="rounded-2xl bg-white border border-line p-5 mb-4">
        <h2 className="font-bold mb-3">{title} ({count})</h2>
        <div className="flex flex-col gap-2">{children}</div>
      </div>
    );

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="font-display uppercase text-3xl leading-none mb-1">Search</h1>
      <p className="text-sm text-gray-500 mb-5">Booking ID, customer, phone, team, payment, or ground.</p>

      <div className="flex gap-2 mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Search everything…"
          className="flex-1 rounded-xl px-4 py-2.5 text-sm border border-line bg-white outline-none"
        />
        <button onClick={search} className="px-5 py-2.5 text-sm font-semibold text-white bg-green rounded-xl">
          Search
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Searching…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {results && (
        <>
          <Section title="Bookings" count={results.bookings.length}>
            {results.bookings.map((b) => (
              <div key={b._id} className="text-sm border-b border-gray-100 pb-2 last:border-0">
                <strong>{b.customerName}</strong> · {b.ground?.name} · {b.date} · {b.startTime}-{b.endTime} · <span className="text-gray-400">{b.status}</span>
              </div>
            ))}
          </Section>

          <Section title="Customers" count={results.customers.length}>
            {results.customers.map((c) => (
              <Link key={c._id} href={`/dashboard/customers/${c._id}`} className="text-sm border-b border-gray-100 pb-2 last:border-0 text-green font-medium">
                {c.fullName} — {c.phone}
              </Link>
            ))}
          </Section>

          <Section title="Teams" count={results.teams.length}>
            {results.teams.map((t) => (
              <Link key={t._id} href={`/dashboard/teams/${t._id}`} className="text-sm border-b border-gray-100 pb-2 last:border-0 text-green font-medium">
                {t.name}
              </Link>
            ))}
          </Section>

          <Section title="Grounds" count={results.grounds.length}>
            {results.grounds.map((g) => (
              <div key={g._id} className="text-sm border-b border-gray-100 pb-2 last:border-0">
                {g.name} (#{g.groundNumber})
              </div>
            ))}
          </Section>

          <Section title="Payments" count={results.payments.length}>
            {results.payments.map((p) => (
              <div key={p._id} className="text-sm border-b border-gray-100 pb-2 last:border-0">
                {p.customer?.fullName} · Rs {p.amount.toLocaleString()} · {p.paymentDate} · <span className="text-gray-400">{p.status}</span>
              </div>
            ))}
          </Section>

          {Object.values(results).every((arr) => arr.length === 0) && (
            <p className="text-sm text-gray-500">No results for "{q}".</p>
          )}
        </>
      )}
    </div>
  );
}
