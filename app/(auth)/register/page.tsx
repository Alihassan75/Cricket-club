"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import Captcha, { CaptchaValue } from "@/components/Captcha";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaValue>({ token: "", answer: "" });
  const [captchaKey, setCaptchaKey] = useState(0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, captchaToken: captcha.token, captchaAnswer: captcha.answer }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Registration failed.");
      router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err.message);
      setCaptchaKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell tagline="Set up your arena's workspace in minutes — grounds, staff and pricing, all in one place.">
      <h2 className="font-display uppercase text-4xl leading-none mb-2">Create your account</h2>
      <p className="text-sm text-gray-500 mb-6">Join the club — book grounds and enter tournaments.</p>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          className="field"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@arena.pk"
          type="email"
          className="field"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          type="password"
          className="field"
        />
        <Captcha onChange={setCaptcha} resetKey={captchaKey} />
        {error && <p className="text-xs text-ball font-medium">{error}</p>}
        <button
          disabled={loading || captcha.answer.trim().length < 5}
          className="btn-ball"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="text-center text-sm mt-6 text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-ball">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
