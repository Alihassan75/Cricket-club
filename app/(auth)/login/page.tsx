"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import Captcha, { CaptchaValue } from "@/components/Captcha";

/** One sign-in form for everybody. The account decides where you land (player portal or your dashboard). */
export default function LoginPage() {
  const router = useRouter();
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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, captchaToken: captcha.token, captchaAnswer: captcha.answer }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.needsVerification) {
          router.push(`/verify-otp?email=${encodeURIComponent(data.email)}`);
          return;
        }
        throw new Error(data.error || "Sign in failed.");
      }
      // Hard navigation (not router.push): the client router cache can still hold the previous
      // account's dashboard (e.g. the Backyard Manager's) and show it to the next person who signs in.
      window.location.assign(data.user?.role === "customer" ? "/portal" : "/dashboard");
    } catch (err: any) {
      setError(err.message);
      setCaptchaKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell tagline="Book grounds, enter tournaments and see every photo and video from the club.">
      <h2 className="font-display uppercase text-4xl leading-none mb-2">Sign in</h2>
      <p className="text-sm text-gray-500 mb-6">Welcome back — enter your email and password.</p>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" type="email" autoComplete="email" className="field" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" type="password" autoComplete="current-password" className="field" />
        <div className="flex justify-end -mt-1">
          <Link href="/forgot-password" className="text-xs font-semibold text-ball">Forgot password?</Link>
        </div>
        <Captcha onChange={setCaptcha} resetKey={captchaKey} />
        {error && <p role="alert" className="text-xs text-ball font-medium">{error}</p>}
        <button disabled={loading || captcha.answer.trim().length < 5} className="btn-ball">{loading ? "Signing in…" : "Sign in"}</button>
      </form>
      <p className="text-center text-sm mt-6 text-gray-500">
        New to the club? <Link href="/register" className="font-semibold text-ball">Create an account</Link>
        <span className="block mt-2">Just want to play? <Link href="/play" className="font-semibold text-ball">Send a play request</Link></span>
      </p>
    </AuthShell>
  );
}
