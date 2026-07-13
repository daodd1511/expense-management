import { SettingsBody } from "@/features/settings/components/Settings";
import { MobilePageContainer } from "@/shared/components/MobilePageContainer";

export function MobileSettings() {
  return (
    <MobilePageContainer className="gap-0 px-4 py-5">
      <SettingsBody />
    </MobilePageContainer>
  );
}
