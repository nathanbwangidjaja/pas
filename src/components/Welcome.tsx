import { Logo } from "./Logo";
import { Screen } from "./ui";
import { EmailSignIn } from "./EmailSignIn";
import { GuestButton } from "./GuestButton";

// The first screen you hit: sign in to keep your handles and friends, or continue as a guest.
export function Welcome() {
  return (
    <Screen>
      <main className="flex flex-1 flex-col justify-center px-7">
        <Logo size={40} />
        <h1 className="mt-5 text-[28px] font-semibold leading-tight tracking-tight">
          Split a bill
          <br />
          in a snap.
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
          Sign in to keep your Venmo and Zelle saved and your friends a tap away. Your friends never
          need an account.
        </p>

        <div className="mt-8">
          <EmailSignIn />
        </div>

        <div className="mt-4">
          <GuestButton />
        </div>
      </main>
    </Screen>
  );
}
