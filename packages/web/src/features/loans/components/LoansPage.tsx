import { useIsDesktop } from "@/shared/hooks/useIsDesktop";
import { DesktopLoans } from "./DesktopLoans";
import { MobileLoans } from "./MobileLoans";

/** Responsive entry point for the personal-loans workspace. */
export function LoansPage({
  loanId,
  createIntentToken,
  onCreateIntentHandled,
  onLoanIdChange,
}: {
  loanId?: string;
  createIntentToken?: string;
  onCreateIntentHandled?: () => void;
  onLoanIdChange?: (loanId: string | null) => void;
}) {
  const isDesktop = useIsDesktop();
  if (isDesktop === null) return null;
  const props = { loanId, createIntentToken, onCreateIntentHandled, onLoanIdChange };
  return isDesktop ? <DesktopLoans {...props} /> : <MobileLoans {...props} />;
}
