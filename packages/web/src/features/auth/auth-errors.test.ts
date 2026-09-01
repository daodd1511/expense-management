import { describe, expect, it } from "vitest";
import { AppAuthError, toAppAuthError } from "./auth-errors";

describe("toAppAuthError", () => {
  it("maps invalid credentials to a stable translation key", () => {
    const error = toAppAuthError({ message: "Invalid login credentials" });

    expect(error).toBeInstanceOf(AppAuthError);
    expect(error.translationKey).toBe("auth.errorInvalidCredentials");
  });

  it("maps duplicate-email provider messages to email-in-use copy", () => {
    const error = toAppAuthError({ message: "User already registered" });

    expect(error.translationKey).toBe("auth.errorEmailInUse");
  });

  it("maps Better Auth rate limits to retry-later copy", () => {
    const error = toAppAuthError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests",
    });

    expect(error.translationKey).toBe("auth.errorRateLimit");
  });

  it("maps Better Auth credential failures", () => {
    const error = toAppAuthError({ code: "INVALID_EMAIL_OR_PASSWORD" });

    expect(error.translationKey).toBe("auth.errorInvalidCredentials");
  });

  it("falls back to the generic auth error key for unknown failures", () => {
    const error = toAppAuthError({ message: "Something strange happened" });

    expect(error.translationKey).toBe("auth.errorGeneric");
  });
});
