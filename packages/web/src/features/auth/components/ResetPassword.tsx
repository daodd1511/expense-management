import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppAuthError } from "@/features/auth/auth-errors";
import { useAuth } from "@/features/auth/auth";
import { useLang } from "@/core/i18n";
import { FormErrorBanner } from "@/shared/components/FormErrorBanner";
import { LoadingScreen } from "@/shared/components/LoadingScreen";
import { Button } from "@/shared/components/ui/button";
import { Input, Label } from "@/shared/components/ui/input";
import { AuthCardLayout } from "./AuthCardLayout";

export function ResetPasswordPage({ redirectTo }: { redirectTo: string }) {
  const { user, loading, updatePassword } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && !isSubmitting) {
      setErrorMessage(null);
    }
  }, [isSubmitting, loading, user]);

  if (loading) return <LoadingScreen />;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      setErrorMessage(t("auth.errorPasswordMismatch"));
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await updatePassword({ password });
      void navigate({ href: redirectTo, replace: true });
    } catch (error) {
      const authError =
        error instanceof AppAuthError ? error : new AppAuthError("auth.errorGeneric");
      setErrorMessage(t(authError.translationKey));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <AuthCardLayout
        title={t("auth.resetPasswordTitle")}
        subtitle={t("auth.resetPasswordSubtitle")}
        footerLinks={[{ to: "/auth/sign-in", label: t("auth.backToSignIn") }]}
      >
        <FormErrorBanner message={t("auth.errorInvalidResetLink")} />
      </AuthCardLayout>
    );
  }

  return (
    <AuthCardLayout
      title={t("auth.resetPasswordTitle")}
      subtitle={t("auth.resetPasswordSubtitle")}
      footerLinks={[{ to: "/auth/sign-in", label: t("auth.backToSignIn") }]}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="reset-password-password">{t("auth.password")}</Label>
          <Input
            id="reset-password-password"
            type="password"
            value={password}
            autoComplete="new-password"
            placeholder={t("auth.passwordPlaceholder")}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reset-password-confirm">{t("auth.confirmPassword")}</Label>
          <Input
            id="reset-password-confirm"
            type="password"
            value={confirmPassword}
            autoComplete="new-password"
            placeholder={t("auth.confirmPasswordPlaceholder")}
            onChange={(event) => setConfirmPassword(event.target.value)}
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
          loadingLabel={t("auth.updatingPassword")}
        >
          {t("auth.updatePassword")}
        </Button>
      </form>
    </AuthCardLayout>
  );
}
