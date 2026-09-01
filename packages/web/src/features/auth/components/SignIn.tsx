import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppAuthError } from "@/features/auth/auth-errors";
import { useAuth } from "@/features/auth/auth";
import { useLang } from "@/core/i18n";
import { FormErrorBanner } from "@/shared/components/FormErrorBanner";
import { Button } from "@/shared/components/ui/button";
import { Input, Label } from "@/shared/components/ui/input";
import { AuthCardLayout } from "./AuthCardLayout";

export function SignIn({ redirectTo }: { redirectTo: string }) {
  const { signInWithPassword, user, loading } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      void navigate({ href: redirectTo, replace: true });
    }
  }, [loading, navigate, redirectTo, user]);

  const handlePasswordSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSigningIn(true);

    try {
      await signInWithPassword({ email, password });
    } catch (error) {
      const authError =
        error instanceof AppAuthError ? error : new AppAuthError("auth.errorGeneric");
      setErrorMessage(t(authError.translationKey));
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <AuthCardLayout
      title={t("auth.signInTitle")}
      subtitle={t("auth.signInSubtitle")}
      footerLinks={[{ to: "/auth/sign-up", label: t("auth.noAccount") }]}
    >
      <form className="space-y-4" onSubmit={handlePasswordSignIn}>
        <div className="space-y-1.5">
          <Label htmlFor="sign-in-email">{t("auth.email")}</Label>
          <Input
            id="sign-in-email"
            type="email"
            value={email}
            autoComplete="email"
            placeholder={t("auth.emailPlaceholder")}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sign-in-password">{t("auth.password")}</Label>
          <Input
            id="sign-in-password"
            type="password"
            value={password}
            autoComplete="current-password"
            placeholder={t("auth.passwordPlaceholder")}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
          />
        </div>

        {errorMessage && <FormErrorBanner message={errorMessage} />}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={isSigningIn}
          loadingLabel={t("auth.signingIn")}
        >
          {t("auth.signIn")}
        </Button>
      </form>
    </AuthCardLayout>
  );
}
