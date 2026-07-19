import { describe, expect, it } from "vitest";
import { accountPatchToRow, fromAccount, toAccount } from "./account.mapper";

const storedAccount = {
  id: "account-1",
  owner_id: "user-1",
  name: "Cash",
  kind: "cash" as const,
  opening_balance: 1_000_000,
  display_order: 2,
  archived: false,
  created_at: "2026-07-01T00:00:00.000Z",
};

describe("account mapper", () => {
  it("maps the persistent display order", () => {
    expect(toAccount(storedAccount)).toEqual({
      id: "account-1",
      name: "Cash",
      kind: "cash",
      openingBalance: 1_000_000,
      displayOrder: 2,
    });
  });

  it("leaves display order to append-on-create persistence", () => {
    expect(
      fromAccount({
        account: { name: "Bank", kind: "bank", openingBalance: 500_000 },
        ownerId: "user-1",
      }),
    ).toEqual({
      owner_id: "user-1",
      name: "Bank",
      kind: "bank",
      opening_balance: 500_000,
    });
  });

  it("does not expose display order through the general patch mapper", () => {
    expect(accountPatchToRow({ name: "Wallet" })).toEqual({ name: "Wallet" });
  });
});
