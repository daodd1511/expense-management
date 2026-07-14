export type AppSection =
  | "dashboard"
  | "reports"
  | "transactions"
  | "planning"
  | "budgets"
  | "subscriptions"
  | "position"
  | "accounts"
  | "loans"
  | "settings"
  | "settings-categories";

export type NavigationArea =
  | "overview"
  | "activity"
  | "planning"
  | "position"
  | "insights"
  | "manage";

export function sectionFromPath(pathname: string): AppSection {
  if (pathname === "/reports" || pathname.startsWith("/reports/")) return "reports";
  if (pathname === "/transactions" || pathname.startsWith("/transactions/")) return "transactions";
  if (pathname === "/planning" || pathname.startsWith("/planning/")) return "planning";
  if (pathname === "/budgets" || pathname.startsWith("/budgets/")) return "budgets";
  if (pathname === "/subscriptions" || pathname.startsWith("/subscriptions/"))
    return "subscriptions";
  if (pathname === "/position" || pathname.startsWith("/position/")) return "position";
  if (pathname === "/accounts" || pathname.startsWith("/accounts/")) return "accounts";
  if (pathname === "/loans" || pathname.startsWith("/loans/")) return "loans";
  if (pathname === "/settings/categories" || pathname.startsWith("/settings/categories/"))
    return "settings-categories";
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return "settings";
  return "dashboard";
}

export function isSettingsSection(section: AppSection) {
  return section === "settings" || section === "settings-categories";
}

export function navigationAreaFromSection(section: AppSection): NavigationArea {
  if (section === "transactions") return "activity";
  if (section === "planning" || section === "budgets" || section === "subscriptions") {
    return "planning";
  }
  if (section === "position" || section === "accounts" || section === "loans") {
    return "position";
  }
  if (isSettingsSection(section)) return "manage";
  return "overview";
}
