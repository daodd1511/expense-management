
import { DesktopSettings } from '@/features/settings/components/Settings'
import { MobilePageContainer } from '@/shared/components/MobilePageContainer'

export function MobileSettings({ onNavigateToCategories }: { onNavigateToCategories: () => void }) {
  return (
    <MobilePageContainer className="gap-0 px-4 py-5">
      <DesktopSettings onNavigateToCategories={onNavigateToCategories} />
    </MobilePageContainer>
  )
}
