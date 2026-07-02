
import { DesktopSettings } from '@/features/settings/components/Settings'

export function MobileSettings({ onNavigateToCategories }: { onNavigateToCategories: () => void }) {
  return (
    <div className="px-4 py-5">
      <DesktopSettings onNavigateToCategories={onNavigateToCategories} />
    </div>
  )
}
