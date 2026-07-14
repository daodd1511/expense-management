import type { TranslationKey } from "@/core/i18n";
import type { AppSection, NavigationArea } from "./app-route-state";

export type AppRoute =
  | "/"
  | "/reports"
  | "/transactions"
  | "/planning"
  | "/budgets"
  | "/subscriptions"
  | "/position"
  | "/accounts"
  | "/loans"
  | "/settings/categories"
  | "/settings";

export type NavigationItem = {
  readonly href: AppRoute;
  readonly section: AppSection;
  readonly labelKey: TranslationKey;
};

export type NavigationGroup = {
  readonly area: NavigationArea;
  readonly labelKey: TranslationKey;
  readonly items: readonly NavigationItem[];
};

export const DESKTOP_NAVIGATION: readonly NavigationGroup[] = [
  {
    area: "overview",
    labelKey: "nav.areaOverview",
    items: [{ href: "/", section: "dashboard", labelKey: "nav.dashboard" }],
  },
  {
    area: "activity",
    labelKey: "nav.areaActivity",
    items: [{ href: "/transactions", section: "transactions", labelKey: "nav.transactions" }],
  },
  {
    area: "planning",
    labelKey: "nav.areaPlanning",
    items: [
      { href: "/budgets", section: "budgets", labelKey: "nav.budgets" },
      { href: "/subscriptions", section: "subscriptions", labelKey: "nav.subscriptions" },
    ],
  },
  {
    area: "position",
    labelKey: "nav.areaPosition",
    items: [
      { href: "/accounts", section: "accounts", labelKey: "nav.accounts" },
      { href: "/loans", section: "loans", labelKey: "nav.loans" },
    ],
  },
  {
    area: "insights",
    labelKey: "nav.areaInsights",
    items: [{ href: "/reports", section: "reports", labelKey: "nav.reports" }],
  },
] as const;
