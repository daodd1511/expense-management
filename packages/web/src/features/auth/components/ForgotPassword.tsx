import { useState } from "react";
import { AppAuthError } from "@/features/auth/auth-errors";
import { useAuth } from "@/features/auth/auth";
import { useLang } from "@/core/i18n";
import { FormErrorBanner } from "@/shared/components/FormErrorBanner";
import { Button } from "@/shared/components/ui/button";
import { Input, Label } from "@/shared/components/ui/input";
import { AuthCardLayout } from "./AuthCardLayout";

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      await requestPasswordReset({ email });
      setSuccessMessage(t("auth.resetEmailSent"));
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
      title={t("auth.forgotPasswordTitle")}
      subtitle={t("auth.forgotPasswordSubtitle")}
      footerLinks={[
        { to: "/auth/sign-in", label: t("auth.backToSignIn") },
        { to: "/auth/sign-up", label: t("auth.noAccount") },
      ]}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="forgot-password-email">{t("auth.email")}</Label>
          <Input
            id="forgot-password-email"
            type="email"
            value={email}
            autoComplete="email"
            placeholder={t("auth.emailPlaceholder")}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        {errorMessage && <FormErrorBanner message={errorMessage} />}
        {successMessage && (
          <div className="rounded-lg bg-income/10 px-3 py-2 text-sm font-medium text-income">
            {successMessage}
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={isSubmitting}
          loadingLabel={t("auth.sendingResetEmail")}
        >
          {t("auth.sendResetEmail")}
        </Button>
      </form>
    </AuthCardLayout>
  );
}
