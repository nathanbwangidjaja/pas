"use client";
import { Logo } from "@/components/Logo";
import { Screen, buttonClass } from "@/components/ui";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Screen>
      <main className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <Logo size={40} />
        <h1 className="mt-5 text-[20px] font-semibold">Something went wrong</h1>
        <p className="mt-2 text-[14px] text-ink-2">That didn&apos;t work. Give it another try.</p>
        <button className={`${buttonClass("primary")} mt-6 w-auto px-6`} onClick={reset}>
          Try again
        </button>
      </main>
    </Screen>
  );
}
