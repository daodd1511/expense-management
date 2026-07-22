import { toast } from "sonner";
import { isClientError } from "@/core/api";
import { translate } from "@/core/i18n";

/**
 * Collapses a burst of query failures (the app fires ~10 top-level queries at once,
 * so one dead API means ten near-simultaneous errors) into a single toast.
 */
const TOAST_THROTTLE_MS = 5_000;
let lastToastAt = 0;

/**
 * `QueryCache.onError` handler — shown once a query has exhausted its retries and
 * given up. Copy is chosen by status family (same convention as the mutation handler),
 * never the backend's raw message. Throttled so a wave of concurrent failures surfaces
 * one notification rather than a stack of duplicates.
 */
export function handleQueryError(error: unknown) {
  // 5xx/network failures are surfaced by the app error boundary (see main.tsx
  // `throwOnError`), so don't also toast them. Only the non-throwing 4xx land here.
  if (!isClientError(error)) return;

  const now = Date.now();
  if (now - lastToastAt < TOAST_THROTTLE_MS) return;
  lastToastAt = now;

  toast.error(translate("error.badRequest"));
}
