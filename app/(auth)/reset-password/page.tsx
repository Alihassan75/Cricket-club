"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import OtpInput from "@/components/OtpInput";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") || "";

  const [step, setStep] = useState<"otp" | "newpw">("otp");
  const [otp, setOtp] = useState("");
  const [pw, setPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [left, setLeft] = useState(30);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const resend = async () => {
    setError("");
    setLeft(30);
    await fetch("/api/auth/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, purpose: "reset_password" }),
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (step === "otp") {
      if (otp.length < 6) {
        setError("Enter the full 6-digit code.");
        return;
      }
      setStep("newpw");
      return;
    }

    if (pw.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (pw !== confirmPw) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp, newPassword: pw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Bad code — send back to the OTP step.
        setStep("otp");
        throw new Error(data.error || "Reset failed.");
      }
      router.push("/login");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell tagline="Check your inbox — codes are valid for 10 minutes and can only be used once.">
      {step === "otp" ? (
        <>
          <h2 className="font-display uppercase text-4xl leading-none mb-2">Enter verification code</h2>
          <p className="text-sm text-gray-500 mb-6">
            We emailed a 6-digit code to <strong className="text-gray-800">{email}</strong>.
          </p>
          <form onSubmit={submit}>
            <OtpInput value={otp} onChange={setOtp} />
            {error && <p className="text-xs text-ball font-medium mt-2">{error}</p>}
            <button className="mt-5 w-full rounded-xl py-2.5 font-semibold text-sm text-white bg-green">
              Verify code
            </button>
          </form>
          <div className="text-center text-sm mt-6 text-gray-500">
            {left > 0 ? (
              <>Resend code in {left}s</>
            ) : (
              <button onClick={resend} className="font-semibold text-ball">
                Resend code
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <h2 className="font-display uppercase text-4xl leading-none mb-2">Set a new password</h2>
          <p className="text-sm text-gray-500 mb-6">Code verified. Choose a new password.</p>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <input
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="New password"
              type="password"
              className="field"
            />
            <input
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Confirm new password"
              type="password"
              className="field"
            />
            {error && <p className="text-xs text-ball font-medium">{error}</p>}
            <button
              disabled={loading}
              className="btn-ball"
            >
              {loading ? "Resetting…" : "Reset password"}
            </button>
          </form>
        </>
      )}
      <p className="text-center text-sm mt-6 text-gray-500">
        <Link href="/login" className="font-semibold text-ball">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
