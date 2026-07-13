import { AlertCircle } from "lucide-react";

/** Inline failure banner for forms — rendered when a submit attempt fails. */
export function FormErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-center gap-2 rounded-lg bg-expense/10 px-3 py-2 text-sm font-medium text-expense"
    >
      <AlertCircle className="size-4 shrink-0" />
      {message}
    </div>
  );
}
