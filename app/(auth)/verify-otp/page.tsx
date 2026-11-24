"use client";
import { takeNext } from "@/lib/postLogin";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import OtpInput from "@/components/OtpInput";

function VerifyOtpForm() {
  const params = useSearchParams();
  const email = params.get("email") || "";
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [left, setLeft] = useState(30);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (otp.length < 6) {
      setError("Enter the full 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Verification failed.");
      window.location.assign(data.user?.role === "customer" ? takeNext() || "/portal" : "/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError("");
    setLeft(30);
    await fetch("/api/auth/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, purpose: "verify_email" }),
    });
  };

  return (
    <AuthShell tagline="Check your inbox — codes are valid for 10 minutes and can only be used once.">
      <h2 className="font-display uppercase text-4xl leading-none mb-2">Verify your email</h2>
      <p className="text-sm text-gray-500 mb-6">
        We sent a 6-digit code to <strong className="text-gray-800">{email}</strong>.
      </p>
      <form onSubmit={verify}>
        <OtpInput value={otp} onChange={setOtp} />
        {error && <p className="text-xs text-ball font-medium mt-2">{error}</p>}
        <button
          disabled={loading}
          className="mt-5 w-full rounded-xl py-2.5 font-semibold text-sm text-white bg-green disabled:opacity-60"
        >
          {loading ? "Verifying…" : "Verify & continue"}
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
    </AuthShell>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpForm />
    </Suspense>
  );
}
