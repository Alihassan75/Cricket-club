import crypto from "crypto";
import nodemailer from "nodemailer";

const OTP_TTL_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

export function generateOtp(): string {
  // 6-digit numeric code, zero-padded
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function otpExpiryDate(): Date {
  return new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
}

export { MAX_OTP_ATTEMPTS };

let transporter: nodemailer.Transporter | null = null;
function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

export async function sendOtpEmail(
  to: string,
  code: string,
  purpose: "verify_email" | "reset_password"
) {
  const subject =
    purpose === "verify_email"
      ? "Verify your Backyard Cricket Club account"
      : "Reset your Backyard Cricket Club password";

  const heading =
    purpose === "verify_email" ? "Confirm your email" : "Reset your password";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 420px; margin: 0 auto;">
      <h2 style="color:#0B1526;">${heading}</h2>
      <p style="color:#444;">Use the code below. It expires in ${OTP_TTL_MINUTES} minutes.</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; background:#F4F6F5; padding: 16px 24px; border-radius: 12px; text-align:center; color:#0B1526;">
        ${code}
      </div>
      <p style="color:#888; font-size: 12px; margin-top: 16px;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;

  // In development, if SMTP isn't configured, just log the code instead of failing.
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log(`[DEV] OTP for ${to} (${purpose}): ${code}`);
    return;
  }

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}
