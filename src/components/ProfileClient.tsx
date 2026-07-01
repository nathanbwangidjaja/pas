"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail } from "lucide-react";
import { isValidVenmoUsername, isValidZelleHandle } from "@/lib/payments";
import { saveProfile, signOut } from "@/app/actions";
import { Avatar, BottomBar, Header, Screen } from "./ui";
import { Button } from "./Button";

interface Friend {
  id: string;
  name: string;
  venmoUsername: string | null;
  zelleHandle: string | null;
}

export function ProfileClient({
  email,
  displayName,
  venmo: venmoInit,
  zelle: zelleInit,
  friends,
}: {
  email: string;
  displayName: string;
  venmo: string;
  zelle: string;
  friends: Friend[];
}) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [venmo, setVenmo] = useState(venmoInit);
  const [zelle, setZelle] = useState(zelleInit);
  const [saved, setSaved] = useState(false);

  const venmoBad = venmo.trim().length > 0 && !isValidVenmoUsername(venmo);
  const zelleBad = zelle.trim().length > 0 && !isValidZelleHandle(zelle);
  const canSave = !venmoBad && !zelleBad;

  async function save() {
    if (!canSave) return;
    await saveProfile({
      displayName: name.trim() || null,
      venmoUsername: venmo.trim() || null,
      zelleHandle: zelle.trim() || null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <Screen>
      <Header backHref="/" title="Profile" />

      <main className="flex-1 overflow-y-auto px-5 pb-4">
        <div className="mt-2 flex items-center gap-3">
          <Avatar name={name || "You"} colorIndex={0} size={52} />
          <div className="min-w-0">
            <div className="truncate text-[17px] font-semibold">{name || "Your name"}</div>
            <div className="truncate text-[13px] text-ink-2">{email}</div>
          </div>
        </div>

        <label className="mt-6 block">
          <span className="mb-1.5 block text-[13px] text-ink-2">Display name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Rivera"
            className="w-full rounded-xl border border-line-strong bg-card px-3.5 py-3 text-[15px] outline-none focus:border-brand"
          />
        </label>

        <div className="mt-6 mb-2 text-[12px] font-medium tracking-wide text-ink-3">
          YOUR PAYMENT HANDLES
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[13px] text-ink-2">Venmo username</span>
          <div
            className={`flex items-center rounded-xl border bg-card px-3.5 py-3 ${
              venmoBad ? "border-danger" : "border-line-strong focus-within:border-brand"
            }`}
          >
            <span className="text-ink-3">@</span>
            <input
              value={venmo.replace(/^@/, "")}
              onChange={(e) => setVenmo(e.target.value)}
              placeholder="alex-rivera"
              className="w-full bg-transparent pl-1 text-[15px] outline-none"
            />
          </div>
          {venmoBad && (
            <p className="mt-1.5 text-[12px] text-danger">
              Venmo usernames can&apos;t contain spaces. Try @alex-rivera.
            </p>
          )}
        </label>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[13px] text-ink-2">Zelle email or phone</span>
          <input
            value={zelle}
            onChange={(e) => setZelle(e.target.value)}
            placeholder="alex@email.com"
            className={`w-full rounded-xl border bg-card px-3.5 py-3 text-[15px] outline-none ${
              zelleBad ? "border-danger" : "border-line-strong focus:border-brand"
            }`}
          />
          {zelleBad && (
            <p className="mt-1.5 text-[12px] text-danger">Use an email or a US phone number.</p>
          )}
        </label>

        <div className="mt-4 flex items-start gap-2 rounded-xl bg-brand-soft px-3.5 py-3 text-[12px] text-brand">
          <Mail size={15} className="mt-0.5 shrink-0" />
          <span>
            Friends only ever see a handle when you send them a request — never your full contact
            list.
          </span>
        </div>

        {friends.length > 0 && (
          <>
            <div className="mt-7 mb-2 flex items-center justify-between">
              <span className="text-[12px] font-medium tracking-wide text-ink-3">SAVED FRIENDS</span>
              <span className="text-[12px] text-ink-3">{friends.length}</span>
            </div>
            <div className="overflow-hidden rounded-2xl border border-line bg-card">
              {friends.map((f, i) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 px-3.5 py-3"
                  style={i ? { borderTop: "1px solid var(--color-line)" } : undefined}
                >
                  <Avatar name={f.name} colorIndex={i + 1} size={34} />
                  <span className="flex-1 text-[15px]">{f.name}</span>
                  <span className="text-[12px] text-ink-2">
                    {f.venmoUsername ? `Venmo @${f.venmoUsername.replace(/^@/, "")}` : f.zelleHandle}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        <button
          onClick={async () => {
            await signOut();
            router.push("/");
          }}
          className="mt-7 flex items-center gap-1 text-[14px] text-ink-2"
        >
          Sign out <ArrowRight size={14} />
        </button>
      </main>

      <BottomBar>
        <Button onClick={save} disabled={!canSave}>
          {saved ? "Saved" : "Save changes"}
        </Button>
      </BottomBar>
    </Screen>
  );
}
