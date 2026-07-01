import { CalendarClock, Pause, Pencil, Play, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { CategoryIcon, colorVar } from '@/components/category-icon'
import { SubscriptionDueBanner } from '@/components/shared/subscription-due-banner'
import { SubscriptionForm } from '@/components/shared/subscription-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Drawer } from '@/components/ui/overlay'
import { formatVND } from '@/lib/format'
import { useLang } from '@/lib/i18n'
import { useStore } from '@/lib/store'
import { daysUntilDue, isDue, isDueSoon, monthlyEquivalent, totalMonthlyCost } from '@/lib/subscriptions'
import type { Subscription } from '@/lib/types'
import { cn } from '@/lib/utils'

function dueBadge(sub: Subscription) {
  const days = daysUntilDue(sub)
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, cls: 'bg-expense-muted text-expense' }
  if (days === 0) return { label: 'Due today', cls: 'bg-expense-muted text-expense font-semibold' }
  if (days <= 7) return { label: `${days}d left`, cls: 'bg-accent text-primary' }
  return null
}

function SubCard({
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
  const { getCategory, getAccount } = useStore()
  const cat = getCategory(sub.categoryId)
  const acc = getAccount(sub.accountId)
  const badge = dueBadge(sub)
  const due = isDue(sub)

  return (
    <div className={cn(
      'group flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:bg-muted/40',
      due && 'border-expense/40 bg-expense-muted/10',
      !sub.active && 'opacity-50',
    )}>
      {/* Icon */}
      <span className={cn(
        'inline-flex size-10 shrink-0 items-center justify-center rounded-xl',
        due ? 'bg-expense-muted text-expense' : 'bg-accent text-accent-foreground',
      )}>
        <RefreshCw className="size-4.5" />
      </span>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-semibold', !sub.active && 'line-through text-muted-foreground')}>
            {sub.name}
          </span>
          {badge && (
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', badge.cls)}>
              {badge.label}
            </span>
          )}
          {!sub.active && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {t('sub.paused')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {cat && (
            <span className="flex items-center gap-1">
              <span
                className="inline-flex size-4 items-center justify-center rounded"
                style={{ backgroundColor: `color-mix(in oklab, ${colorVar(cat.color)} 20%, transparent)` }}
              >
                <CategoryIcon name={cat.icon} className="size-2.5" style={{ color: colorVar(cat.color) }} />
              </span>
              {cat.name}
            </span>
          )}
          {acc && <span>{acc.name}</span>}
          <span>{sub.cadence === 'monthly' ? t('sub.monthly') : t('sub.yearly')}</span>
          <span>Ngày {sub.dayOfMonth}{sub.cadence === 'yearly' ? ` tháng ${sub.monthOfYear}` : ''}</span>
        </div>
      </div>

      {/* Amount */}
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className={cn(
          'tabular text-base font-bold',
          sub.type === 'income' ? 'text-income' : 'text-foreground',
        )}>
          {formatVND(sub.amount)}
        </span>
        <span className="text-xs text-muted-foreground">
          {sub.cadence === 'yearly'
            ? (formatVND(monthlyEquivalent(sub)) + '/tháng')
            : t('sub.perMonth')}
        </span>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {due && sub.active && (
          <Button size="sm" onClick={onLog} className="h-8 text-xs">
            {t('sub.logNow')}
          </Button>
        )}
        <button
          type="button"
          onClick={onToggleActive}
          title={sub.active ? t('sub.pause') : t('sub.resume')}
          className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {sub.active ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <button
          type="button"
          onClick={onEdit}
          title={t('tx.edit')}
          className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title={t('sub.delete')}
          className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-expense/10 hover:text-expense"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  )
}

export function DesktopSubscriptions() {
  const { subscriptions, addSubscription, updateSubscription, deleteSubscription, logSubscription } = useStore()
  const { t } = useLang()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Subscription | undefined>(undefined)

  const active = subscriptions.filter((s) => s.active)
  const paused = subscriptions.filter((s) => !s.active)
  const dueSoon = active.filter((s) => isDue(s) || isDueSoon(s))
  const rest = active.filter((s) => !isDue(s) && !isDueSoon(s))
  const monthly = totalMonthlyCost(subscriptions)
  const yearlyTotal = active
    .filter((s) => s.cadence === 'yearly')
    .reduce((sum, s) => sum + s.amount, 0)

  const openAdd = () => { setEditing(undefined); setDrawerOpen(true) }
  const openEdit = (s: Subscription) => { setEditing(s); setDrawerOpen(true) }
  const close = () => { setDrawerOpen(false); setEditing(undefined) }

  const handleSubmit = (data: Omit<Subscription, 'id'>) => {
    if (editing) updateSubscription(editing.id, data)
    else addSubscription(data)
    close()
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('sub.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('sub.subtitle')}</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="size-4" />
          {t('sub.addTitle')}
        </Button>
      </div>

      {/* Due banner */}
      <div className="rounded-xl">
        <SubscriptionDueBanner />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarClock className="size-4" /> {t('sub.monthlyCost')}
            </div>
            <div className="tabular mt-1 text-2xl font-bold tracking-tight">{formatVND(monthly)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{t('sub.active')}</p>
            <div className="mt-1 text-2xl font-bold">{active.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{t('sub.yearly')}</p>
            <div className="tabular mt-1 text-2xl font-bold">{formatVND(yearlyTotal)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Due soon */}
      {dueSoon.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-expense">{t('sub.dueSoon')}</h2>
          {dueSoon.map((s) => (
            <SubCard
              key={s.id}
              sub={s}
              onEdit={() => openEdit(s)}
              onDelete={() => deleteSubscription(s.id)}
              onToggleActive={() => updateSubscription(s.id, { active: !s.active })}
              onLog={() => logSubscription(s.id)}
            />
          ))}
        </div>
      )}

      {/* Active */}
      {rest.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">{t('sub.active')}</h2>
          {rest.map((s) => (
            <SubCard
              key={s.id}
              sub={s}
              onEdit={() => openEdit(s)}
              onDelete={() => deleteSubscription(s.id)}
              onToggleActive={() => updateSubscription(s.id, { active: !s.active })}
              onLog={() => logSubscription(s.id)}
            />
          ))}
        </div>
      )}

      {/* Paused */}
      {paused.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{t('sub.paused')}</h2>
          {paused.map((s) => (
            <SubCard
              key={s.id}
              sub={s}
              onEdit={() => openEdit(s)}
              onDelete={() => deleteSubscription(s.id)}
              onToggleActive={() => updateSubscription(s.id, { active: !s.active })}
              onLog={() => logSubscription(s.id)}
            />
          ))}
        </div>
      )}

      {subscriptions.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <CalendarClock className="size-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">{t('sub.empty')}</p>
          <Button variant="outline" onClick={openAdd}>{t('sub.addFirst')}</Button>
        </div>
      )}

      <Drawer open={drawerOpen} onClose={close}>
        <div className="p-5">
          <h2 className="mb-4 text-lg font-semibold">
            {editing ? t('sub.editTitle') : t('sub.addTitle')}
          </h2>
        </div>
        <SubscriptionForm
          initial={editing}
          onSubmit={handleSubmit}
          onCancel={close}
        />
      </Drawer>
    </div>
  )
}
