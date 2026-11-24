/** Shown instantly while a public page loads, so clicking a link always responds right away. */
export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-5 py-12 animate-pulse" aria-busy>
      <div className="h-10 w-64 rounded-xl bg-gray-200 mb-3" />
      <div className="h-4 w-96 max-w-full rounded bg-gray-200 mb-10" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-3xl border border-line bg-white overflow-hidden">
            <div className="h-44 bg-gray-200" />
            <div className="p-5 space-y-3">
              <div className="h-6 w-2/3 rounded bg-gray-200" />
              <div className="h-4 w-full rounded bg-gray-100" />
              <div className="h-4 w-1/2 rounded bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
