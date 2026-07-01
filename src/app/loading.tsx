import { Screen } from "@/components/ui";

export default function Loading() {
  return (
    <Screen>
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-line border-t-brand spin" aria-label="Loading" />
      </div>
    </Screen>
  );
}
