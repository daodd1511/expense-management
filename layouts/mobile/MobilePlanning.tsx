import { useState } from 'react'
import { useLang } from '@/lib/i18n'
import { useStore } from '@/lib/store'
import { dueBanner } from '@/lib/subscriptions'
import { cn } from '@/lib/utils'
import { MobileBudgets } from './budgets'
import { MobileSubscriptions } from './subscriptions'

type PlanTab = 'budgets' | 'subscriptions'

export function MobilePlanning() {
  const [tab, setTab] = useState<PlanTab>('budgets')
  const { t } = useLang()
  const { subscriptions, transactions } = useStore()
  const dueCount = dueBanner(subscriptions, transactions).length

  return (
    <div className="flex flex-col">
      {/* Inner tab bar */}
      <div className="sticky top-[57px] z-20 flex border-b border-border bg-background/95 backdrop-blur-md">
        {(['budgets', 'subscriptions'] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'relative flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors',
              tab === id ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {id === 'budgets' ? t('nav.budgets') : t('nav.subscriptions')}
            {id === 'subscriptions' && dueCount > 0 && (
              <span className="inline-flex size-4 items-center justify-center rounded-full bg-expense text-[0.6rem] font-bold text-expense-foreground">
                {dueCount}
              </span>
            )}
            {tab === id && (
              <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      {tab === 'budgets' ? <MobileBudgets /> : <MobileSubscriptions />}
    </div>
  )
}
