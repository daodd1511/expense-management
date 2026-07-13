import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TransactionsMonthSwitcher } from "./TransactionsMonthSwitcher";

vi.mock("@/core/i18n", () => ({
  DATE_LOCALE: {
    en: {
      months: [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ],
    },
    vi: {
      months: [
        "Tháng 1",
        "Tháng 2",
        "Tháng 3",
        "Tháng 4",
        "Tháng 5",
        "Tháng 6",
        "Tháng 7",
        "Tháng 8",
        "Tháng 9",
        "Tháng 10",
        "Tháng 11",
        "Tháng 12",
      ],
    },
  },
  useLang: () => ({
    lang: "en",
    t: (key: string) =>
      ({
        "tx.monthLabel": "Month",
        "tx.monthPrev": "Previous month",
        "tx.monthNext": "Next month",
        "tx.yearPrev": "Previous year",
        "tx.yearNext": "Next year",
      })[key] ?? key,
  }),
}));

describe("TransactionsMonthSwitcher", () => {
  it("opens a month picker and emits the selected month", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<TransactionsMonthSwitcher month="2026-07" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Month" }));
    await user.click(screen.getByRole("option", { name: "August 2026" }));

    expect(onChange).toHaveBeenLastCalledWith("2026-08");
  });
});
