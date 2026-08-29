import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  useSession: vi.fn(),
  signInEmail: vi.fn(),
  signUpEmail: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/core/auth-client", () => ({
  authClient: {
    useSession: authMocks.useSession,
    signIn: { email: authMocks.signInEmail },
    signUp: { email: authMocks.signUpEmail },
    signOut: authMocks.signOut,
  },
}));

import { AppAuthError } from "./auth-errors";
import { AuthProvider, type AuthContextValue, useAuth } from "./auth";

let authValue: AuthContextValue | undefined;

function AuthProbe() {
  authValue = useAuth();
  return <span>{authValue.user?.email ?? (authValue.loading ? "loading" : "signed-out")}</span>;
}

describe("AuthProvider", () => {
  beforeEach(() => {
    authValue = undefined;
    authMocks.useSession.mockReturnValue({ data: null, isPending: false });
    authMocks.signInEmail.mockReset().mockResolvedValue({ data: {}, error: null });
    authMocks.signUpEmail.mockReset().mockResolvedValue({ data: {}, error: null });
    authMocks.signOut.mockReset().mockResolvedValue({ data: {}, error: null });
  });

  it("exposes the Better Auth User and loading state", () => {
    authMocks.useSession.mockReturnValue({
      data: { user: { id: "user-id", email: "person@example.com", name: "person@example.com" } },
      isPending: false,
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(screen.getByText("person@example.com")).toBeTruthy();
    expect(authValue?.loading).toBe(false);
  });

  it("normalizes email/password requests and derives the signup name", async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await act(async () => {
      await authValue?.signInWithPassword({
        email: " Person@Example.COM ",
        password: "password123",
      });
      await authValue?.signUpWithPassword({
        email: " Person@Example.COM ",
        password: "password123",
      });
    });

    expect(authMocks.signInEmail).toHaveBeenCalledWith({
      email: "person@example.com",
      password: "password123",
    });
    expect(authMocks.signUpEmail).toHaveBeenCalledWith({
      email: "person@example.com",
      name: "person@example.com",
      password: "password123",
    });
  });

  it("maps Better Auth failures into app-owned auth errors", async () => {
    authMocks.signInEmail.mockResolvedValue({
      data: null,
      error: { code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password" },
    });
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await expect(
      authValue?.signInWithPassword({ email: "person@example.com", password: "wrong" }),
    ).rejects.toBeInstanceOf(AppAuthError);
  });
});
