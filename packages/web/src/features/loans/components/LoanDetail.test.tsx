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
    fireEvent.click(screen.getByRole("button", { name: "loans.editRepayment" }));
    expect(onEditRepayment).toHaveBeenCalledWith(loan, loan.events[1]);
  });
});
