import crypto from "crypto";

const TTL_MS = 5 * 60 * 1000;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — easy to misread

// A token can be tried once, right or wrong, so answers can't be brute-forced.
const g = globalThis as unknown as { __captchaUsed?: Map<string, number> };
const used = (g.__captchaUsed ||= new Map<string, number>());

const secret = () => process.env.JWT_SECRET || "dev-captcha-secret";
const sign = (code: string, exp: number, nonce: string) =>
  crypto.createHmac("sha256", secret()).update(`${code}|${exp}|${nonce}`).digest("hex");

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const COLORS = ["#0E2A1F", "#C8372D", "#143A2A", "#8a6410", "#2b3a55"];
const pick = () => COLORS[Math.floor(Math.random() * COLORS.length)];

// Hand-made stroke font (10 × 14 box). Letters are drawn as vector paths — never as <text> —
// so the answer can't simply be read out of the image data.
const GLYPHS: Record<string, number[][][]> = {
  A: [[[0,14],[5,0],[10,14]], [[2,9],[8,9]]],
  B: [[[0,0],[0,14]], [[0,0],[6,0],[9,3],[6,7],[0,7]], [[0,7],[6,7],[9,10.5],[6,14],[0,14]]],
  C: [[[10,3],[7,0],[3,0],[0,3],[0,11],[3,14],[7,14],[10,11]]],
  D: [[[0,0],[0,14]], [[0,0],[6,0],[10,4],[10,10],[6,14],[0,14]]],
  E: [[[10,0],[0,0],[0,14],[10,14]], [[0,7],[7,7]]],
  F: [[[10,0],[0,0],[0,14]], [[0,7],[7,7]]],
  G: [[[10,3],[7,0],[3,0],[0,3],[0,11],[3,14],[7,14],[10,11],[10,8],[5,8]]],
  H: [[[0,0],[0,14]], [[10,0],[10,14]], [[0,7],[10,7]]],
  J: [[[10,0],[10,11],[7,14],[3,14],[0,11]]],
  K: [[[0,0],[0,14]], [[10,0],[0,8]], [[3,6],[10,14]]],
  L: [[[0,0],[0,14],[10,14]]],
  M: [[[0,14],[0,0],[5,8],[10,0],[10,14]]],
  N: [[[0,14],[0,0],[10,14],[10,0]]],
  P: [[[0,14],[0,0],[7,0],[10,3],[10,5],[7,8],[0,8]]],
  Q: [[[3,0],[7,0],[10,3],[10,11],[7,14],[3,14],[0,11],[0,3],[3,0]], [[6,10],[10,14]]],
  R: [[[0,14],[0,0],[7,0],[10,3],[10,5],[7,8],[0,8]], [[5,8],[10,14]]],
  S: [[[10,2],[7,0],[3,0],[0,3],[1,6],[9,8],[10,11],[7,14],[3,14],[0,12]]],
  T: [[[0,0],[10,0]], [[5,0],[5,14]]],
  U: [[[0,0],[0,11],[3,14],[7,14],[10,11],[10,0]]],
  V: [[[0,0],[5,14],[10,0]]],
  W: [[[0,0],[2.5,14],[5,6],[7.5,14],[10,0]]],
  X: [[[0,0],[10,14]], [[10,0],[0,14]]],
  Y: [[[0,0],[5,7],[10,0]], [[5,7],[5,14]]],
  Z: [[[0,0],[10,0],[0,14],[10,14]]],
  "2": [[[0,3],[3,0],[7,0],[10,3],[10,5],[0,14],[10,14]]],
  "3": [[[0,2],[3,0],[7,0],[10,3],[7,6],[4,7],[7,8],[10,11],[7,14],[3,14],[0,12]]],
  "4": [[[7,14],[7,0],[0,10],[10,10]]],
  "5": [[[10,0],[1,0],[0,6],[6,5],[10,8],[10,11],[7,14],[3,14],[0,12]]],
  "6": [[[9,1],[5,0],[1,4],[0,10],[3,14],[7,14],[10,11],[10,8],[7,6],[3,6],[0,9]]],
  "7": [[[0,0],[10,0],[4,14]]],
  "8": [[[5,7],[1,5],[1,2],[4,0],[6,0],[9,2],[9,5],[5,7],[0,9],[0,12],[3,14],[7,14],[10,12],[10,9],[5,7]]],
  "9": [[[1,13],[5,14],[9,10],[10,4],[7,0],[3,0],[0,3],[0,6],[3,8],[7,8],[10,5]]],
};

function renderSvg(code: string) {
  const W = 170, H = 58;
  const n = (v: number) => v.toFixed(1);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#F6F1E7"/>`;
  for (let i = 0; i < 4; i++)
    s += `<path d="M${n(rnd(0, W))} ${n(rnd(0, H))} Q ${n(rnd(0, W))} ${n(rnd(0, H))} ${n(rnd(0, W))} ${n(rnd(0, H))}" stroke="${pick()}" stroke-width="${n(rnd(1, 1.6))}" fill="none" opacity=".35"/>`;
  for (let i = 0; i < 16; i++) s += `<circle cx="${n(rnd(0, W))}" cy="${n(rnd(0, H))}" r="${n(rnd(0.8, 1.8))}" fill="${pick()}" opacity=".45"/>`;
  const step = (W - 24) / code.length;
  [...code].forEach((c, i) => {
    const sc = rnd(1.85, 2.2);
    const ox = 12 + i * step + rnd(-1, 2), oy = (H - 14 * sc) / 2 + rnd(-4, 4);
    const d = (GLYPHS[c] || [])
      .map((line) => "M" + line.map(([x, y]) => `${n(ox + (x + rnd(-0.5, 0.5)) * sc)} ${n(oy + (y + rnd(-0.5, 0.5)) * sc)}`).join(" L"))
      .join(" ");
    const cx = ox + 5 * sc, cy = oy + 7 * sc;
    s += `<path d="${d}" transform="rotate(${n(rnd(-14, 14))} ${n(cx)} ${n(cy)})" stroke="${pick()}" stroke-width="${n(rnd(3.2, 3.9))}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  });
  for (let i = 0; i < 1; i++) s += `<line x1="0" y1="${n(rnd(12, 46))}" x2="${W}" y2="${n(rnd(12, 46))}" stroke="${pick()}" stroke-width="1.3" opacity=".45"/>`;
  return s + "</svg>";
}

export function createCaptcha() {
  const { code: _code, ...pub } = createCaptchaWithCode();
  return pub;
}

/** Internal: also returns the answer (used by tests only — never send `code` to the browser). */
export function createCaptchaWithCode() {
  const code = Array.from({ length: 5 }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join("");
  const exp = Date.now() + TTL_MS;
  const nonce = crypto.randomBytes(8).toString("hex");
  return { token: `${exp}.${nonce}.${sign(code, exp, nonce)}`, svg: renderSvg(code), code };
}

export function verifyCaptcha(token: unknown, answer: unknown): boolean {
  if (typeof token !== "string" || typeof answer !== "string") return false;
  const [expStr, nonce, sig] = token.split(".");
  const exp = Number(expStr);
  if (!exp || !nonce || !sig || exp < Date.now()) return false;
  if (used.has(token)) return false;
  used.set(token, exp);
  if (used.size > 2000) for (const [t, e] of used) if (e < Date.now()) used.delete(t);

  const expected = new Uint8Array(Buffer.from(sign(answer.trim().toUpperCase(), exp, nonce)));
  const given = new Uint8Array(Buffer.from(sig));
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}
