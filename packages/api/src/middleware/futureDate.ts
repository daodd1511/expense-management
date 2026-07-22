import { createMiddleware } from "hono/factory";
import { jsonError } from "../lib/response";

/**
 * The client's local calendar date, derived from the `X-Client-Timezone` header
 * (an IANA zone like `Asia/Ho_Chi_Minh`). Returns `null` when the header is absent
 * or names an invalid zone — callers treat `null` as "cannot determine" and skip
 * the future-date check rather than risk a false rejection.
 *
 * The server itself has no trustworthy local date (it runs in UTC), so a purely
 * server-side `new Date()` check rejects legitimate same-day entries whenever the
 * user's zone is ahead of UTC. See `shared/lib/date.ts` and ADR/CLAUDE.md notes.
 */
function clientTodayIso(timeZone: string | undefined): string | null {
  if (!timeZone) return null;
  try {
    // `en-CA` formats as `YYYY-MM-DD`; an invalid `timeZone` throws RangeError.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return null;
  }
}

/**
 * Post-validation guard rejecting date-only fields that fall after the client's
 * local "today". Run it *after* the request's `zValidator("json", …)` so the
 * validated body is available via `c.req.valid("json")`.
 *
 * @param fields Map of validated body field name → user-facing rejection message.
 *   Missing or non-string values (e.g. an omitted optional in a PATCH) are ignored.
 */
export function rejectFutureDates(fields: Record<string, string>) {
  return createMiddleware(async (c, next) => {
    const today = clientTodayIso(c.req.header("X-Client-Timezone"));
    if (today) {
      // The validator has already parsed and stored the body; read it back. Typed
      // loosely here because this generic middleware is not parameterized by schema.
      const body = c.req.valid("json" as never) as Record<string, unknown>;
      const fieldErrors: Record<string, string[]> = {};
      for (const [field, message] of Object.entries(fields)) {
        const value = body[field];
        if (typeof value === "string" && value > today) {
          fieldErrors[field] = [message];
        }
      }
      if (Object.keys(fieldErrors).length > 0) {
        return jsonError(c, 400, "Invalid request body", { fieldErrors });
      }
    }
    await next();
  });
}
