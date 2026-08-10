import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MobileApp } from "./MobileApp";

const navigate = vi.fn();
const openCreate = vi.fn();
const location = {
  pathname: "/",
  search: {},
  href: "/?month=2026-07",
};

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    children: ReactNode;
    to: string;
  } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  Outlet: () => <div>outlet</div>,
  useLocation: () => location,
  useNavigate: () => navigate,
}));

vi.mock("@/features/transactions/transaction-overlay", () => ({
  useTransactionOverlay: () => ({ openCreate, openEdit: vi.fn(), close: vi.fn() }),
  TransactionOverlaySheet: () => null,
}));

vi.mock("@/shared/components/LoadingScreen", () => ({
  LoadingScreen: () => <div>loading</div>,
}));

vi.mock("@/core/i18n", () => ({
  useLang: () => ({
    t: (key: string) =>
      ({
        "nav.home": "Home",
        "nav.activity": "Activity",
        "nav.plan": "Plan",
        "nav.position": "Position",
        "nav.settings": "Settings",
        "nav.dashboard": "Dashboard",
        "app.addTransaction": "Add transaction",
      })[key] ?? key,
  }),
}));

vi.mock("@/features/transactions/queries", () => ({
  useTransactions: () => ({ data: [] }),
}));

vi.mock("@/features/subscriptions/queries", () => ({
  useSubscriptions: () => ({ data: [] }),
}));

vi.mock("@/shared/hooks/useAppDataLoading", () => ({
  useAppDataLoading: () => false,
}));

vi.mock("@/features/subscriptions/helpers", () => ({
  dueBanner: () => [],
}));

describe("MobileApp", () => {
  it("opens the transaction overlay without routing to /transactions/new", async () => {
    const user = userEvent.setup();
    openCreate.mockClear();
    navigate.mockReset();
    location.pathname = "/";
    location.href = "/?month=2026-07";

    render(<MobileApp />);

    const home = screen.getByRole("link", { name: "Home" });
    const activity = screen.getByRole("link", { name: "Activity" });
    const plan = screen.getByRole("link", { name: "Plan" });
    const position = screen.getByRole("link", { name: "Position" });

    expect(home.compareDocumentPosition(activity) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(activity.compareDocumentPosition(plan) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(plan.compareDocumentPosition(position) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Add transaction" }));

    expect(openCreate).toHaveBeenCalledWith("2026-07");
    expect(navigate).not.toHaveBeenCalledWith(expect.objectContaining({ to: "/transactions/new" }));
  });

  it("prefills the single Account filter when creating from the transaction list", async () => {
    const user = userEvent.setup();
    openCreate.mockClear();
    location.pathname = "/transactions";
    location.href = "/transactions?month=2026-07&accountId=bank";

    render(<MobileApp />);

    await user.click(screen.getByRole("button", { name: "Add transaction" }));

    expect(openCreate).toHaveBeenCalledWith("2026-07", "bank");
  });
});
