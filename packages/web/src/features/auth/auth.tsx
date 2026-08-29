import { createContext, useContext } from "react";
import { authClient, type AuthUser } from "@/core/auth-client";
import { toAppAuthError } from "@/features/auth/auth-errors";

type PasswordCredentials = {
  email: string;
  password: string;
};

export interface AuthContextValue {
  user: AuthUser | null;
  signInWithPassword: (credentials: PasswordCredentials) => Promise<void>;
  signUpWithPassword: (credentials: PasswordCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const session = authClient.useSession();

  const signInWithPassword = async ({ email, password }: PasswordCredentials) => {
    const result = await authClient.signIn.email({
      email: email.trim().toLowerCase(),
      password,
    });
    if (result.error) throw toAppAuthError(result.error);
  };

  const signUpWithPassword = async ({ email, password }: PasswordCredentials) => {
    const normalizedEmail = email.trim().toLowerCase();
    const result = await authClient.signUp.email({
      email: normalizedEmail,
      name: normalizedEmail,
      password,
    });
    if (result.error) throw toAppAuthError(result.error);
  };

  const signOut = async () => {
    const result = await authClient.signOut();
    if (result.error) throw toAppAuthError(result.error);
  };

  return (
    <AuthContext.Provider
      value={{
        user: session.data?.user ?? null,
        signInWithPassword,
        signUpWithPassword,
        signOut,
        loading: session.isPending,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
