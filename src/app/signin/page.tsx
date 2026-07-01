"use client";
import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";
import { BottomBar, Screen, buttonClass } from "@/components/ui";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink() {
    setBusy(true);
    setError(null);
    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) setError("That didn't work. Check the email and try again.");
    else setSent(true);
  }

  if (sent) {
    return (
      <Screen>
        <main className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <MailCheck size={30} />
          </div>
          <h1 className="mt-6 text-[22px] font-semibold">Check your email</h1>
          <p className="mt-2 text-[14px] text-ink-2">
            We sent a sign-in link to <span className="font-medium text-ink">{email}</span>. Tap it
            on this phone and you&apos;re in.
          </p>
          <button onClick={() => setSent(false)} className="mt-5 text-[14px] font-medium text-brand">
            Use a different email
          </button>
        </main>
      </Screen>
    );
  }

  return (
    <Screen>
      <main className="flex flex-1 flex-col justify-center px-7">
        <Logo size={40} />
        <h1 className="mt-5 text-[26px] font-semibold leading-tight tracking-tight">
          Save your handles
          <br />
          for next time.
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
          Sign in to keep your Venmo and Zelle saved and your friends a tap away. No password — we
          email you a link.
        </p>

        <label className="mt-7 block">
          <span className="mb-1.5 block text-[13px] text-ink-2">Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            inputMode="email"
            placeholder="you@email.com"
            className="w-full rounded-xl border border-line-strong bg-card px-3.5 py-3 text-[15px] outline-none focus:border-brand"
          />
        </label>
        {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
      </main>

      <BottomBar>
        <button
          className={buttonClass("primary")}
          onClick={sendLink}
          disabled={busy || !email.includes("@")}
        >
          {busy ? "Sending…" : "Email me a sign-in link"}
        </button>
        <Link href="/" className={`${buttonClass("ghost")} block text-center`}>
          Continue as guest
        </Link>
      </BottomBar>
    </Screen>
  );
}
