import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Screen, buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <Screen>
      <main className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <Logo size={40} />
        <h1 className="mt-5 text-[20px] font-semibold">This link isn&apos;t working</h1>
        <p className="mt-2 text-[14px] text-ink-2">
          The bill may have been deleted, or the link is incomplete.
        </p>
        <Link href="/" className={`${buttonClass("primary")} mt-6 w-auto px-6`}>
          Go home
        </Link>
      </main>
    </Screen>
  );
}
