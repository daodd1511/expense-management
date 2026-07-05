import { createContext, useContext } from 'react'
import type { Transaction } from '@/core/types'

type TransactionOverlayContextValue = {
  openAdd: () => void
  openEdit: (transaction: Transaction) => void
}

const TransactionOverlayContext = createContext<TransactionOverlayContextValue | null>(null)

export function TransactionOverlayProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: TransactionOverlayContextValue
}) {
  return <TransactionOverlayContext.Provider value={value}>{children}</TransactionOverlayContext.Provider>
}

export function useTransactionOverlay() {
  const context = useContext(TransactionOverlayContext)

  if (!context) {
    throw new Error('useTransactionOverlay must be used within TransactionOverlayProvider')
  }

  return context
}
