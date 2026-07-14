import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LoanDetail as LoanDetailModel } from "@wallet/shared";
import { LoanDetail } from "./LoanDetail";

const loan: LoanDetailModel = {
  id: "loan-1",
  personId: "person-1",
  personName: "Mai",
  direction: "lending",
  description: "Deposit",
  originAmount: 1_000_000,
  outstandingBalance: 600_000,
  dueDate: "2026-07-20",
  status: "open",
  events: [
    {
      id: "origin-1",
      loanId: "loan-1",
      kind: "disbursement",
      amount: 1_000_000,
      date: "2026-07-01",
    },
    { id: "repayment-1", loanId: "loan-1", kind: "repayment", amount: 400_000, date: "2026-07-10" },
  ],
};

vi.mock("@/core/i18n", () => ({ useLang: () => ({ t: (key: string) => key }) }));
vi.mock("@/features/loans/queries", () => ({
  useLoanDetail: () => ({ data: loan, isPending: false, isError: false }),
}));

describe("LoanDetail", () => {
  it("renders event history and exposes lifecycle actions", () => {
    const onRepay = vi.fn();
    const onEditRepayment = vi.fn();
    render(
      <LoanDetail
        loanId="loan-1"
        variant="desktop"
        onBack={vi.fn()}
        onRepay={onRepay}
        onEditRepayment={onEditRepayment}
        onDeleteRepayment={vi.fn()}
        onCorrectOrigin={vi.fn()}
        onCloseLoan={vi.fn()}
        onReopen={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("loans.eventDisbursement")).toBeTruthy();
    expect(screen.getByText("loans.eventRepayment")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "loans.recordRepayment" }));
    expect(onRepay).toHaveBeenCalledWith(loan);
    fireEvent.click(screen.getByTestId("loan-event-main-repayment-1"));
    expect(onEditRepayment).toHaveBeenCalledWith(loan, loan.events[1]);
    expect(screen.queryByRole("button", { name: "loans.editRepayment" })).toBeNull();
    expect(screen.queryByRole("button", { name: "loans.deleteRepayment" })).toBeNull();

    for (const amount of screen.getAllByTestId(/loan-event-amount-/)) {
      expect(amount.classList.contains("w-32")).toBe(true);
      expect(amount.classList.contains("text-right")).toBe(true);
    }

    expect(screen.getByTestId("loan-lifecycle-actions").classList.contains("flex")).toBe(true);
    const deleteButton = screen.getByRole("button", { name: "loans.deleteLoan" });
    expect(deleteButton.classList.contains("w-full")).toBe(true);
  });

  it("reveals repayment actions with a swipe on mobile", () => {
    const onEditRepayment = vi.fn();
    const onDeleteRepayment = vi.fn();
    render(
      <LoanDetail
        loanId="loan-1"
        variant="mobile"
        onBack={vi.fn()}
        onRepay={vi.fn()}
        onEditRepayment={onEditRepayment}
        onDeleteRepayment={onDeleteRepayment}
        onCorrectOrigin={vi.fn()}
        onCloseLoan={vi.fn()}
        onReopen={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const row = screen.getByTestId("loan-event-repayment-1");
    fireEvent.touchStart(row, { touches: [{ clientX: 200, clientY: 20 }] });
    fireEvent.touchMove(row, { touches: [{ clientX: 60, clientY: 20 }] });
    fireEvent.touchEnd(row);

    expect(row.style.transform).toBe("translateX(-128px)");
    expect(row.classList.contains("w-full")).toBe(true);
    expect(row.classList.contains("pr-1")).toBe(true);
    expect(row.parentElement?.classList.contains("rounded-lg")).toBe(false);
    const timeline = screen.getByTestId("loan-event-timeline");
    const marker = screen.getByTestId("loan-event-marker-repayment-1");
    expect(timeline.classList.contains("before:left-2")).toBe(true);
    expect(timeline.classList.contains("before:-translate-x-1/2")).toBe(true);
    expect(marker.classList.contains("left-1/2")).toBe(true);
    expect(marker.classList.contains("-translate-x-1/2")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "loans.editRepayment" }));
    fireEvent.click(screen.getByRole("button", { name: "loans.deleteRepayment" }));
    expect(onEditRepayment).toHaveBeenCalledWith(loan, loan.events[1]);
    expect(onDeleteRepayment).toHaveBeenCalledWith(loan, loan.events[1]);
  });
});
