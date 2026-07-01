"use client";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { buttonClass } from "./ui";

// The email half of sign-in: enter an email, get a magic link. Shared by the landing screen
// and /signin so there's one copy of the flow.
export function EmailSignIn() {
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
      <div className="flex flex-col items-center py-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <MailCheck size={26} />
        </div>
        <h2 className="mt-4 text-[18px] font-semibold">Check your email</h2>
        <p className="mt-1.5 text-[14px] text-ink-2">
          We sent a sign-in link to <span className="font-medium text-ink">{email}</span>. Tap it on
          this phone and you&apos;re in.
        </p>
        <button onClick={() => setSent(false)} className="mt-4 text-[14px] font-medium text-brand">
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div>
      <label className="block">
        <span className="mb-1.5 block text-[13px] text-ink-2">Email</span>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          inputMode="email"
          placeholder="you@email.com"
          className="w-full rounded-xl border border-line-strong bg-card px-3.5 py-3 outline-none focus:border-brand"
        />
      </label>
      {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
      <button
        className={`${buttonClass("primary")} mt-3`}
        onClick={sendLink}
        disabled={busy || !email.includes("@")}
      >
        {busy ? "Sending…" : "Email me a sign-in link"}
      </button>
    </div>
  );
}
