import type { ReactNode } from 'react'
import { Button } from '@/shared/components/ui/button'

/** Sticky cancel/submit action bar shared by every full-screen sheet/drawer form. */
export function FormFooterBar({
  cancelLabel,
  onCancel,
  submitLabel,
  onSubmit,
  canSubmit,
  isSubmitting,
  extra,
}: {
  cancelLabel: string
  onCancel: () => void
  submitLabel: string
  onSubmit: () => void
  canSubmit: boolean
  isSubmitting: boolean
  extra?: ReactNode
}) {
  return (
    <div className="sticky bottom-0 flex gap-2 bg-card px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
      <Button variant="outline" size="lg" className="h-11 flex-1" disabled={isSubmitting} onClick={onCancel}>
        {cancelLabel}
      </Button>
      {extra}
      <Button size="lg" className="h-11 flex-[2]" disabled={!canSubmit} loading={isSubmitting} onClick={onSubmit}>
        {submitLabel}
      </Button>
    </div>
  )
}
