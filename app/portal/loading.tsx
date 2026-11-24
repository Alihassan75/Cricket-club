/** Shown instantly while a page in this area loads, so every click responds right away. */
export default function Loading() {
  return (
    <div className="p-6 animate-pulse" aria-busy>
      <div className="h-9 w-56 rounded-xl bg-gray-200 mb-6" />
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 rounded-2xl bg-gray-200" />)}
      </div>
      <div className="h-64 rounded-2xl bg-gray-200" />
    </div>
  );
}
