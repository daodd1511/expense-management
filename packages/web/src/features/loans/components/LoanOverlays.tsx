import { useState } from "react";
import { useLang } from "@/core/i18n";
import { useAccounts } from "@/features/accounts/queries";
import {
  useAddDisbursedLoan,
  useAddLoanRepayment,
  useAddOpeningLoan,
  useAddPerson,
  useCloseLoan,
  useDeleteLoan,
  useDeleteLoanRepayment,
  usePeople,
  useReopenLoan,
  useUpdateLoanDisbursement,
  useUpdateLoanRepayment,
} from "@/features/loans/queries";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { BottomSheet, Drawer, Modal } from "@/shared/components/ui/overlay";
import { todayLocalIso } from "@/shared/lib/date";
import type { LoanDetail as LoanDetailModel, LoanEvent } from "@wallet/shared";
import { LoanDetail } from "./LoanDetail";
import { LoanForm, type LoanFormSubmission } from "./LoanForm";
import { OriginForm } from "./OriginForm";
import { RepaymentForm } from "./RepaymentForm";

type RepaymentState = { loan: LoanDetailModel; event?: LoanEvent };
type Confirmation = {
  title: string;
  message: string;
  label: string;
  action: () => Promise<void>;
};

function ResponsiveOverlay({
  variant,
  open,
  onClose,
  title,
  children,
  modal = false,
}: {
  variant: "desktop" | "mobile";
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  modal?: boolean;
}) {
  if (variant === "mobile")
    return (
      <BottomSheet open={open} onClose={onClose} title={title} fullHeight>
        {children}
      </BottomSheet>
    );
  if (modal)
    return (
      <Modal open={open} onClose={onClose}>
        {children}
      </Modal>
    );
  return (
    <Drawer open={open} onClose={onClose}>
      {children}
    </Drawer>
  );
}

export function LoanOverlays({
  variant,
  createOpen,
  onCreateOpenChange,
  detailLoanId,
  onDetailLoanIdChange,
}: {
  variant: "desktop" | "mobile";
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  detailLoanId: string | null;
  onDetailLoanIdChange: (id: string | null) => void;
}) {
  const { t } = useLang();
  const { data: people = [] } = usePeople();
  const { data: accounts = [] } = useAccounts();
  const addPerson = useAddPerson();
  const addDisbursed = useAddDisbursedLoan();
  const addOpening = useAddOpeningLoan();
  const addRepayment = useAddLoanRepayment();
  const updateRepayment = useUpdateLoanRepayment();
  const deleteRepayment = useDeleteLoanRepayment();
  const updateOrigin = useUpdateLoanDisbursement();
  const closeLoan = useCloseLoan();
  const reopenLoan = useReopenLoan();
  const deleteLoan = useDeleteLoan();
  const [repayment, setRepayment] = useState<RepaymentState | null>(null);
  const [originLoan, setOriginLoan] = useState<LoanDetailModel | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const handleCreateLoan = async (submission: LoanFormSubmission) => {
    const loan =
      submission.mode === "opening"
        ? await addOpening.mutateAsync(submission.input)
        : await addDisbursed.mutateAsync(submission.input);
    onCreateOpenChange(false);
    onDetailLoanIdChange(loan.id);
  };

  const requestClose = (loan: LoanDetailModel) => {
    const lending = loan.direction === "lending";
    setConfirmation({
      title: lending ? t("loans.writeOffTitle") : t("loans.forgiveTitle"),
      message: lending ? t("loans.writeOffMessage") : t("loans.forgiveMessage"),
      label: lending ? t("loans.writeOff") : t("loans.forgive"),
      action: async () => {
        await closeLoan.mutateAsync({
          loanId: loan.id,
          input: { kind: lending ? "write_off" : "forgiveness", date: todayLocalIso() },
        });
        setConfirmation(null);
      },
    });
  };

  const requestReopen = (loan: LoanDetailModel) =>
    setConfirmation({
      title: t("loans.reopenTitle"),
      message: t("loans.reopenMessage"),
      label: t("loans.reopen"),
      action: async () => {
        await reopenLoan.mutateAsync(loan.id);
        setConfirmation(null);
      },
    });

  const requestDeleteLoan = (loan: LoanDetailModel) =>
    setConfirmation({
      title: t("loans.deleteTitle"),
      message: t("loans.deleteMessage"),
      label: t("loans.deleteLoan"),
      action: async () => {
        await deleteLoan.mutateAsync(loan.id);
        setConfirmation(null);
        onDetailLoanIdChange(null);
      },
    });

  const requestDeleteRepayment = (loan: LoanDetailModel, event: LoanEvent) =>
    setConfirmation({
      title: t("loans.deleteRepaymentTitle"),
      message: t("loans.deleteRepaymentMessage"),
      label: t("loans.deleteRepayment"),
      action: async () => {
        await deleteRepayment.mutateAsync({ loanId: loan.id, eventId: event.id });
        setConfirmation(null);
      },
    });

  return (
    <>
      <ResponsiveOverlay
        variant={variant}
        open={createOpen}
        onClose={() => onCreateOpenChange(false)}
        title={t("loans.newLoan")}
      >
        <LoanForm
          people={people}
          accounts={accounts}
          onCreatePerson={(name) => addPerson.mutateAsync({ name })}
          onSubmit={handleCreateLoan}
          onCancel={() => onCreateOpenChange(false)}
        />
      </ResponsiveOverlay>

      <ResponsiveOverlay
        variant={variant}
        open={detailLoanId !== null}
        onClose={() => onDetailLoanIdChange(null)}
        title={t("loans.detail")}
      >
        {detailLoanId && (
          <LoanDetail
            loanId={detailLoanId}
            onBack={() => onDetailLoanIdChange(null)}
            onRepay={(loan) => setRepayment({ loan })}
            onEditRepayment={(loan, event) => setRepayment({ loan, event })}
            onDeleteRepayment={requestDeleteRepayment}
            onCorrectOrigin={setOriginLoan}
            onCloseLoan={requestClose}
            onReopen={requestReopen}
            onDelete={requestDeleteLoan}
          />
        )}
      </ResponsiveOverlay>

      <ResponsiveOverlay
        variant={variant}
        modal
        open={repayment !== null}
        onClose={() => setRepayment(null)}
        title={t("loans.recordRepayment")}
      >
        {repayment && (
          <RepaymentForm
            loan={repayment.loan}
            initial={repayment.event}
            accounts={accounts}
            onSubmit={async (input) => {
              if (repayment.event)
                await updateRepayment.mutateAsync({
                  loanId: repayment.loan.id,
                  eventId: repayment.event.id,
                  patch: input,
                });
              else await addRepayment.mutateAsync({ loanId: repayment.loan.id, input });
              setRepayment(null);
            }}
            onCancel={() => setRepayment(null)}
          />
        )}
      </ResponsiveOverlay>

      <ResponsiveOverlay
        variant={variant}
        modal
        open={originLoan !== null}
        onClose={() => setOriginLoan(null)}
        title={t("loans.correctOrigin")}
      >
        {originLoan && (
          <OriginForm
            loan={originLoan}
            accounts={accounts}
            onSubmit={async (patch) => {
              await updateOrigin.mutateAsync({ id: originLoan.id, patch });
              setOriginLoan(null);
            }}
            onCancel={() => setOriginLoan(null)}
          />
        )}
      </ResponsiveOverlay>

      <ConfirmDialog
        open={confirmation !== null}
        title={confirmation?.title}
        message={confirmation?.message}
        confirmLabel={confirmation?.label}
        onCancel={() => setConfirmation(null)}
        onConfirm={async () => confirmation?.action()}
      />
    </>
  );
}
