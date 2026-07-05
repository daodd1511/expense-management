import { CalendarClock, Pause, Play, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { SubscriptionForm } from '@/features/subscriptions/components/SubscriptionForm'
import { Card, CardContent } from '@/shared/components/ui/card'
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog'
import { BottomSheet } from '@/shared/components/ui/overlay'
import { formatShortDate, formatVND } from '@/shared/lib/format'
import { useLang } from '@/core/i18n'
import {
  useAddSubscription,
  useDeleteSubscription,
  useLogSubscription,
  useSubscriptions,
  useUpdateSubscription,
} from '@/features/subscriptions/queries'
import { daysUntilDue, isDue, isDueSoon, monthlyEquivalent, totalMonthlyCost } from '@/features/subscriptions/helpers'
import type { Subscription } from '@/core/types'
import { cn } from '@/shared/lib/utils'

function dueBadge(sub: Subscription, t: (k: string, v?: Record<string, string | number>) => string) {
  const days = daysUntilDue(sub)
  if (days < 0) return { label: t('sub.daysOverdue', { n: Math.abs(days) }), cls: 'text-expense' }
  if (days === 0) return { label: t('sub.dueToday'), cls: 'text-expense font-semibold' }
  if (days <= 7) return { label: t('sub.daysLeft', { n: days }), cls: 'text-primary' }
  return null
}

function SubRow({
  sub,
  onEdit,
  onDelete,
  onToggleActive,
  onLog,
}: {
  sub: Subscription
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
  onLog: () => void
}) {
  const { t } = useLang()
  const [dx, setDx] = useState(0)
  const startX = useRef<number | null>(null)
  const badge = dueBadge(sub, t as (k: string, v?: Record<string, string | number>) => string)
  const due = isDue(sub)

  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX }
  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current == null) return
    const delta = e.touches[0].clientX - startX.current
    setDx(Math.max(Math.min(delta, 0), -148))
  }
  const onTouchEnd = () => {
    setDx((d) => (d < -74 ? -148 : 0))
    startX.current = null
  }

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex">
        <button
          type="button"
          onClick={onToggleActive}
          aria-label={sub.active ? t('sub.pause') : t('sub.resume')}
          className="flex w-[74px] items-center justify-center bg-accent text-accent-foreground"
        >
          {sub.active ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={t('sub.delete')}
          className="flex w-[74px] items-center justify-center bg-expense text-expense-foreground"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div
        className="flex items-center gap-3 bg-card py-3"
        style={{ transform: `translateX(${dx}px)`, transition: 'transform 0.2s' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <button
          type="button"
          onClick={onEdit}
          className={cn(
            'inline-flex size-9 shrink-0 items-center justify-center rounded-xl',
            due ? 'bg-expense-muted text-expense' : 'bg-accent text-accent-foreground',
          )}
        >
          <RefreshCw className="size-4" />
        </button>

        <button
          type="button"
          onClick={onEdit}
          className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
        >
          <span className="flex flex-col">
            <span className={cn('text-sm font-medium', !sub.active && 'text-muted-foreground line-through')}>
              {sub.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {sub.cadence === 'monthly' ? t('sub.monthly') : t('sub.yearly')}
              {' · '}
              {formatShortDate(sub.nextDueDate)}
              {badge && (
                <span className={cn('ml-2', badge.cls)}> · {badge.label}</span>
              )}
            </span>
          </span>
          <span className="flex flex-col items-end">
            <span className={cn(
              'tabular shrink-0 text-sm font-semibold',
              sub.type === 'income' ? 'text-income' : 'text-foreground',
            )}>
              {formatVND(sub.amount)}
            </span>
            <span className="text-xs text-muted-foreground">
              {sub.cadence === 'yearly' ? t('sub.perYear') : t('sub.perMonth')}
            </span>
          </span>
        </button>

        {due && (
          <button
            type="button"
            onClick={onLog}
            className="shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground transition-colors active:scale-95"
          >
            {t('sub.logNow')}
          </button>
        )}
      </div>
    </div>
  )
}

export function MobileSubscriptions() {
  const { data: subscriptions = [] } = useSubscriptions()
  const addSub = useAddSubscription()
  const updateSub = useUpdateSubscription()
  const deleteSub = useDeleteSubscription()
  const logSub = useLogSubscription()
  const { t } = useLang()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const active = subscriptions.filter((s) => s.active)
  const paused = subscriptions.filter((s) => !s.active)
  const dueSoon = active.filter((s) => isDue(s) || isDueSoon(s))
  const rest = active.filter((s) => !isDue(s) && !isDueSoon(s))
  const monthly = totalMonthlyCost(subscriptions)

  const openAdd = () => { setEditing(null); setSheetOpen(true) }
  const openEdit = (s: Subscription) => { setEditing(s); setSheetOpen(true) }
  const close = () => { setSheetOpen(false); setEditing(null) }

  const handleSubmit = async (data: Omit<Subscription, 'id'>) => {
    if (editing) await updateSub.mutateAsync({ id: editing.id, patch: data })
    else await addSub.mutateAsync(data)
    close()
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Summary card */}
      <Card className="border-0 bg-primary text-primary-foreground">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 text-sm opacity-80">
            <CalendarClock className="size-4" /> {t('sub.monthlyCost')}
          </div>
          <div className="tabular mt-1 text-3xl font-bold tracking-tight">{formatVND(monthly)}</div>
          <p className="mt-1 text-sm opacity-80">{t('sub.activeCount', { n: active.length })}</p>
        </CardContent>
      </Card>

      {/* Due soon section */}
      {dueSoon.length > 0 && (
        <Card className="overflow-hidden border-expense/30">
          <CardContent className="px-4 py-3">
            <h2 className="mb-2 text-sm font-semibold tracking-tight text-expense">{t('sub.dueSoon')}</h2>
          </CardContent>
          <div className="flex flex-col divide-y divide-border px-4">
            {dueSoon.map((s) => (
              <SubRow
                key={s.id}
                sub={s}
                onEdit={() => openEdit(s)}
                onDelete={() => setPendingDeleteId(s.id)}
                onToggleActive={() => updateSub.mutateAsync({ id: s.id, patch: { active: !s.active } })}
                onLog={() => logSub.mutateAsync(s)}
              />
            ))}
          </div>
          <div className="pb-1" />
        </Card>
      )}

      {/* Active */}
      {rest.length > 0 && (
        <Card className="overflow-hidden">
          <CardContent className="px-4 py-3">
            <h2 className="mb-2 text-sm font-semibold tracking-tight">{t('sub.active')}</h2>
          </CardContent>
          <div className="flex flex-col divide-y divide-border px-4">
            {rest.map((s) => (
              <SubRow
                key={s.id}
                sub={s}
                onEdit={() => openEdit(s)}
                onDelete={() => setPendingDeleteId(s.id)}
                onToggleActive={() => updateSub.mutateAsync({ id: s.id, patch: { active: !s.active } })}
                onLog={() => logSub.mutateAsync(s)}
              />
            ))}
          </div>
          <div className="pb-1" />
        </Card>
      )}

      {/* Paused */}
      {paused.length > 0 && (
        <Card className="overflow-hidden opacity-60">
          <CardContent className="px-4 py-3">
            <h2 className="mb-2 text-sm font-semibold tracking-tight text-muted-foreground">{t('sub.paused')}</h2>
          </CardContent>
          <div className="flex flex-col divide-y divide-border px-4">
            {paused.map((s) => (
              <SubRow
                key={s.id}
                sub={s}
                onEdit={() => openEdit(s)}
                onDelete={() => setPendingDeleteId(s.id)}
                onToggleActive={() => updateSub.mutateAsync({ id: s.id, patch: { active: !s.active } })}
                onLog={() => logSub.mutateAsync(s)}
              />
            ))}
          </div>
          <div className="pb-1" />
        </Card>
      )}

      {subscriptions.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <CalendarClock className="size-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t('sub.empty')}</p>
          <button
            type="button"
            onClick={openAdd}
            className="text-sm font-medium text-primary"
          >
            {t('sub.addFirst')}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={openAdd}
        className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4 text-sm font-medium text-muted-foreground hover:bg-muted"
      >
        <Plus className="size-4" /> {t('sub.addTitle')}
      </button>

      <BottomSheet
        open={sheetOpen}
        onClose={close}
        title={editing ? t('sub.editTitle') : t('sub.addTitle')}
      >
        <SubscriptionForm
          initial={editing ?? undefined}
          onSubmit={handleSubmit}
          onCancel={close}
        />
      </BottomSheet>
      <ConfirmDialog
        open={pendingDeleteId !== null}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={async () => {
          if (pendingDeleteId) await deleteSub.mutateAsync(pendingDeleteId)
          setPendingDeleteId(null)
        }}
      />
    </div>
  )
}
