/** A short burst of green / black / white confetti (CSS only) for the "slot reserved" moment. */
export default function Confetti() {
  const colors = ["#16A34A", "#4ADE80", "#0A0A0A", "#FFFFFF", "#15803D"];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-0 overflow-visible">
      {Array.from({ length: 28 }).map((_, i) => (
        <span key={i} className="confetti-bit" style={{ left: `${(i * 37) % 100}%`, background: colors[i % colors.length], animationDelay: `${(i % 7) * 60}ms`, ["--dx" as any]: `${((i * 53) % 120) - 60}px`, ["--rot" as any]: `${(i * 97) % 360}deg` }} />
      ))}
    </div>
  );
}
