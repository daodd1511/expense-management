import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/shared/lib/utils'

/** Default padded root for a mobile screen's content. Pages that need edge-to-edge
 * sections (swipeable rows) should wrap only the padded part of their content in
 * this, not the full-bleed container itself. */
export function MobilePageContainer({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('flex flex-col gap-4 p-4', className)} {...props} />
}
