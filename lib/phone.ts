/**
 * Accepts Pakistani mobiles in any usual spelling (0300 1234567, +92 300 1234567, 0300-1234567…) and returns
 * the clean 03XXXXXXXXX form; other international numbers must start with "+". Returns null if it isn't a valid number.
 */
export function normalizePhone(raw: string): string | null {
  const d = (raw || "").replace(/[\s\-().]/g, "");
  if (/^(\+92|0092|92|0)?3\d{9}$/.test(d)) return "0" + d.slice(-10);
  if (/^\+\d{8,15}$/.test(d)) return d;
  return null;
}
