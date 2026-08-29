import { CreditCard } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useLang } from "@/core/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

type AuthLink = {
  label: string;
  to: "/auth/sign-in" | "/auth/sign-up";
};

export function AuthCardLayout({
  title,
  subtitle,
  children,
  footerLinks = [],
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footerLinks?: AuthLink[];
}) {
  const { t } = useLang();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-background px-4 py-10 text-foreground">
      <div className="flex flex-col items-center gap-4">
        <span className="inline-flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <CreditCard className="size-8" />
        </span>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">{t("app.name")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("app.tagline")}</p>
        </div>
      </div>

      <Card className="w-full max-w-md rounded-3xl border-border/80 bg-card/95">
        <CardHeader className="gap-2 pb-3 text-center">
          <CardTitle className="text-xl">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {children}
          {footerLinks.length > 0 && (
            <div className="flex flex-col gap-2 text-center text-sm">
              {footerLinks.map((link) => (
                <Link
                  key={`${link.to}-${link.label}`}
                  to={link.to}
                  className="font-medium text-primary hover:underline"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
