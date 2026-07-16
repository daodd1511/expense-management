import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useLang } from "@/core/i18n";
import { useAccounts } from "@/features/accounts/queries";
import { BottomSheet, Drawer } from "@/shared/components/ui/overlay";
import { todayLocalMonthIso } from "@/shared/lib/date";
import { useAddTransaction, useTransactions, useUpdateTransaction } from "./queries";
import { TransactionForm } from "./components/TransactionForm";

type TransactionOverlayState =
  | { mode: "create"; month: string }
  | { mode: "edit"; transactionId: string; month: string };

type TransactionOverlayActions = {
  openCreate: (month?: string) => void;
  openEdit: (transactionId: string, month: string) => void;
  close: () => void;
};

const ActionsContext = createContext<TransactionOverlayActions | null>(null);
const StateContext = createContext<TransactionOverlayState | null>(null);

export function TransactionOverlayProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TransactionOverlayState | null>(null);
  const { data: accounts = [] } = useAccounts();
  const navigate = useNavigate();

  const actions = useMemo<TransactionOverlayActions>(
    () => ({
      openCreate: (month = todayLocalMonthIso()) => {
        if (accounts.length === 0) {
          navigate({ to: "/accounts", search: { create: String(Date.now()) } });
          return;
        }

        setState({ mode: "create", month });
      },
      openEdit: (transactionId, month) => setState({ mode: "edit", transactionId, month }),
      close: () => setState(null),
    }),
    [accounts.length, navigate],
  );

  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </ActionsContext.Provider>
  );
}

export function useTransactionOverlay() {
  const actions = useContext(ActionsContext);
  if (!actions) {
    throw new Error("useTransactionOverlay must be used within a TransactionOverlayProvider");
  }
  return actions;
}

function useTransactionOverlayState() {
  return useContext(StateContext);
}

export function TransactionOverlaySheet({ variant }: { variant: "mobile" | "desktop" }) {
  const { t } = useLang();
  const state = useTransactionOverlayState();
  const { close } = useTransactionOverlay();
  const month = state?.month ?? todayLocalMonthIso();
  const { data: transactions = [] } = useTransactions(month);
  const addTransaction = useAddTransaction(month);
  const updateTransaction = useUpdateTransaction(month);
  const editing =
    state?.mode === "edit"
      ? transactions.find((transaction) => transaction.id === state.transactionId)
      : undefined;

  useEffect(() => {
    if (state?.mode === "edit" && !editing) {
      close();
    }
  }, [close, editing, state]);

  if (!state) {
    return null;
  }

  if (state.mode === "edit" && !editing) {
    return null;
  }

  const form = (
    <TransactionForm
      variant={variant}
      initial={editing}
      onCancel={close}
      onSubmit={async (transaction) => {
        if (editing) {
          await updateTransaction.mutateAsync({ id: editing.id, patch: transaction });
        } else {
          await addTransaction.mutateAsync(transaction);
        }
        close();
      }}
    />
  );

  if (variant === "mobile") {
    return (
      <BottomSheet
        open
        onClose={close}
        title={state.mode === "edit" ? t("form.editTitle") : t("form.addTitle")}
      >
        {form}
      </BottomSheet>
    );
  }

  return (
    <Drawer open onClose={close}>
      {form}
    </Drawer>
  );
}
