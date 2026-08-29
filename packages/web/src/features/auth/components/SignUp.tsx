import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppAuthError } from "@/features/auth/auth-errors";
import { useAuth } from "@/features/auth/auth";
import { useLang } from "@/core/i18n";
import { FormErrorBanner } from "@/shared/components/FormErrorBanner";
import { Button } from "@/shared/components/ui/button";
import { Input, Label } from "@/shared/components/ui/input";
import { AuthCardLayout } from "./AuthCardLayout";

export function SignUpPage({ redirectTo }: { redirectTo: string }) {
  const { signUpWithPassword, user, loading } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      void navigate({ href: redirectTo, replace: true });
    }
  }, [loading, navigate, redirectTo, user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await signUpWithPassword({ email, password });
    } catch (error) {
      const authError =
        error instanceof AppAuthError ? error : new AppAuthError("auth.errorGeneric");
      setErrorMessage(t(authError.translationKey));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCardLayout
      title={t("auth.signUpTitle")}
      subtitle={t("auth.signUpSubtitle")}
      footerLinks={[{ to: "/auth/sign-in", label: t("auth.haveAccount") }]}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="sign-up-email">{t("auth.email")}</Label>
          <Input
            id="sign-up-email"
            type="email"
            value={email}
            autoComplete="email"
            placeholder={t("auth.emailPlaceholder")}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sign-up-password">{t("auth.password")}</Label>
          <Input
            id="sign-up-password"
            type="password"
            value={password}
            autoComplete="new-password"
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
          loading={isSubmitting}
          loadingLabel={t("auth.signingUp")}
        >
          {t("auth.signUp")}
        </Button>
      </form>
    </AuthCardLayout>
  );
}
