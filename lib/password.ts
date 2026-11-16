import crypto from "crypto";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"; // no 0/O/1/l/I look-alikes

/** A readable random password to hand to a new manager (they can change it later via "Forgot password"). */
export function generatePassword(length = 10): string {
  let out = "";
  for (let i = 0; i < length; i++) out += CHARS[crypto.randomInt(CHARS.length)];
  return /\d/.test(out) && /[a-z]/.test(out) && /[A-Z]/.test(out) ? out : generatePassword(length);
}
