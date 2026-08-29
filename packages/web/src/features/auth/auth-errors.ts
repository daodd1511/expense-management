import type { TranslationKey } from "@/core/i18n";

export class AppAuthError extends Error {
  translationKey: TranslationKey;

  constructor(translationKey: TranslationKey, message?: string) {
    super(message ?? translationKey);
    this.name = "AppAuthError";
    this.translationKey = translationKey;
  }
}

function hasMessage(error: unknown): error is { message: string } {
  return (
    !!error && typeof error === "object" && "message" in error && typeof error.message === "string"
  );
}

function hasCode(error: unknown): error is { code: string } {
  return !!error && typeof error === "object" && "code" in error && typeof error.code === "string";
}

function classifyByMessage(message: string): TranslationKey {
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) return "auth.errorInvalidCredentials";
  if (lower.includes("invalid email or password")) return "auth.errorInvalidCredentials";
  if (lower.includes("user already registered")) return "auth.errorEmailInUse";
  if (lower.includes("already been registered")) return "auth.errorEmailInUse";
  if (lower.includes("already exists")) return "auth.errorEmailInUse";
  if (lower.includes("password should be at least")) return "auth.errorWeakPassword";
  if (lower.includes("password is too weak")) return "auth.errorWeakPassword";
  if (lower.includes("too many requests")) return "auth.errorRateLimit";

  return "auth.errorGeneric";
}

function classifyByCode(code: string): TranslationKey | null {
  switch (code.toLowerCase()) {
    case "invalid_credentials":
    case "invalid_email_or_password":
      return "auth.errorInvalidCredentials";
    case "email_exists":
    case "user_already_exists":
      return "auth.errorEmailInUse";
    case "weak_password":
    case "password_too_short":
      return "auth.errorWeakPassword";
    case "too_many_requests":
      return "auth.errorRateLimit";
    default:
      return null;
  }
}

/** Normalizes provider-auth failures into stable app-owned translation keys. */
export function toAppAuthError(error: unknown): AppAuthError {
  if (error instanceof AppAuthError) return error;

  if (hasCode(error)) {
    const key = classifyByCode(error.code);
    if (key) return new AppAuthError(key, hasMessage(error) ? error.message : undefined);
  }

  if (hasMessage(error)) {
    return new AppAuthError(classifyByMessage(error.message), error.message);
  }

  return new AppAuthError("auth.errorGeneric");
}
