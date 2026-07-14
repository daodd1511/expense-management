import { useIsDesktop } from "@/shared/hooks/useIsDesktop";
import { DesktopLoans } from "./DesktopLoans";
import { MobileLoans } from "./MobileLoans";

/** Responsive entry point for the personal-loans workspace. */
export function LoansPage() {
  const isDesktop = useIsDesktop();
  if (isDesktop === null) return null;
  return isDesktop ? <DesktopLoans /> : <MobileLoans />;
}
