"use client";
import { useRouter } from "next/navigation";
import { continueAsGuest } from "@/app/actions";
import { buttonClass } from "./ui";

export function GuestButton() {
  const router = useRouter();
  return (
    <button
      className={`${buttonClass("ghost")} block text-center`}
      onClick={async () => {
        await continueAsGuest();
        router.push("/");
        router.refresh();
      }}
    >
      Continue as guest
    </button>
  );
}
