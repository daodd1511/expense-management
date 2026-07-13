import { toast } from "sonner";
import { getFieldErrorMessage, isClientError } from "@/core/api";
import { translate } from "@/core/i18n";

/**
 * `MutationCache.onError` handler — shows a generic toast for every failed mutation,
 * with copy selected by status family rather than surfacing the backend's raw message
 * (see docs/specs/error-handling/PLAN.md's "FE: error message text" decision).
 */
export function handleMutationError(error: unknown) {
  toast.error(
    getFieldErrorMessage(error) ??
      translate(isClientError(error) ? "error.badRequest" : "error.server"),
  );
}
