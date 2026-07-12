import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TransactionRow } from '@wallet/shared'
import type { AuthEnv } from '../../middleware/auth'
import { handleError } from '../../middleware/error'

const { getSupabase } = vi.hoisted(() => ({
  getSupabase: vi.fn(),
}))

vi.mock('../../config/supabase', () => ({
  getSupabase,
}))

import * as repository from './repository'
import { transactionsRouter } from './routes'
import * as service from './service'

function tomorrowIsoDate() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function makeApp() {
  const app = new Hono<AuthEnv>()
  app.onError(handleError)
  app.use('*', async (c, next) => {
    c.set('userId', 'user-1')
    await next()
  })
  app.route('/transactions', transactionsRouter)
  return app
}

function makeTransactionRow(overrides: Partial<TransactionRow> = {}): TransactionRow {
  return {
    id: 'tx-1',
    owner_id: 'user-1',
    type: 'expense',
    amount: 100,
    category_id: 'cat-1',
    account_id: 'cash',
    to_account_id: null,
    merchant: 'Merchant',
    note: null,
    tx_date: '2026-07-05',
    tx_time: null,
    receipt_url: null,
    subscription_id: null,
    created_at: '2026-07-05T08:00:00.000Z',
    ...overrides,
  }
}

function buildThenableResult(data: unknown[]) {
  return {
    then(onfulfilled: (value: { data: unknown[]; error: null }) => unknown, onrejected?: (reason: unknown) => unknown) {
      return Promise.resolve({ data, error: null }).then(onfulfilled, onrejected)
    },
  }
}

function buildAccountsBuilder(data: unknown[]) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => buildThenableResult(data)),
  }

  return builder
}

function buildTransactionsBuilder(data: unknown[]) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    lt: vi.fn(() => builder),
    then(onfulfilled: (value: { data: unknown[]; error: null }) => unknown, onrejected?: (reason: unknown) => unknown) {
      return Promise.resolve({ data, error: null }).then(onfulfilled, onrejected)
    },
  }

  return builder
}

function buildClient({ accounts, transactions }: { accounts: unknown[]; transactions: unknown[] }) {
  const accountsBuilder = buildAccountsBuilder(accounts)
  const transactionsBuilder = buildTransactionsBuilder(transactions)
  const from = vi.fn((table: string) => {
    if (table === 'accounts') return accountsBuilder
    if (table === 'transactions') return transactionsBuilder
    throw new Error(`Unexpected table: ${table}`)
  })

  return { from, accountsBuilder, transactionsBuilder }
}

describe('transactions service listTransactions', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    getSupabase.mockReset()
  })

  it('returns newest-first rows with account-specific balanceAfter values', async () => {
    vi.spyOn(repository, 'listAccountOpeningBalances').mockResolvedValue({ cash: 1000, bank: 200 })
    vi.spyOn(repository, 'listTransactionsForBalance').mockResolvedValue([
      {
        id: 'salary',
        type: 'income',
        amount: 500,
        categoryId: 'salary',
        accountId: 'cash',
        toAccountId: null,
        merchant: 'Payroll',
        note: undefined,
        date: '2026-07-01',
        time: '09:00',
        receipt: undefined,
        subscriptionId: null,
      },
      {
        id: 'move',
        type: 'transfer',
        amount: 300,
        categoryId: null,
        accountId: 'cash',
        toAccountId: 'bank',
        merchant: 'Move',
        note: undefined,
        date: '2026-07-02',
        time: '10:00',
        receipt: undefined,
        subscriptionId: null,
      },
      {
        id: 'groceries',
        type: 'expense',
        amount: 50,
        categoryId: 'food',
        accountId: 'bank',
        toAccountId: null,
        merchant: 'Groceries',
        note: undefined,
        date: '2026-07-03',
        time: '18:00',
        receipt: undefined,
        subscriptionId: null,
      },
    ])

    await expect(service.listTransactions('user-1')).resolves.toEqual([
      expect.objectContaining({ id: 'groceries', balanceAfter: 450 }),
      expect.objectContaining({ id: 'move', balanceAfter: 1200 }),
      expect.objectContaining({ id: 'salary', balanceAfter: 1500 }),
    ])
  })

  it('keeps month-filtered balances tied to prior history through the month end', async () => {
    const listTransactionsForBalance = vi
      .spyOn(repository, 'listTransactionsForBalance')
      .mockResolvedValue([
        {
          id: 'june-income',
          type: 'income',
          amount: 1000,
          categoryId: 'salary',
          accountId: 'cash',
          toAccountId: null,
          merchant: 'June salary',
          note: undefined,
          date: '2026-06-30',
          time: '18:00',
          receipt: undefined,
          subscriptionId: null,
        },
        {
          id: 'july-expense',
          type: 'expense',
          amount: 250,
          categoryId: 'food',
          accountId: 'cash',
          toAccountId: null,
          merchant: 'Dinner',
          note: undefined,
          date: '2026-07-02',
          time: '20:00',
          receipt: undefined,
          subscriptionId: null,
        },
      ])
    vi.spyOn(repository, 'listAccountOpeningBalances').mockResolvedValue({ cash: 100 })

    await expect(service.listTransactions('user-1', '2026-07')).resolves.toEqual([
      expect.objectContaining({ id: 'july-expense', balanceAfter: 850 }),
    ])
    expect(listTransactionsForBalance).toHaveBeenCalledWith({
      userId: 'user-1',
      throughExclusive: '2026-08-01',
    })
  })

  it('recomputes later balances when an older row changes or disappears on refetch', async () => {
    vi.spyOn(repository, 'listAccountOpeningBalances').mockResolvedValue({ cash: 1000 })
    const listTransactionsForBalance = vi
      .spyOn(repository, 'listTransactionsForBalance')
      .mockResolvedValueOnce([
        {
          id: 'older',
          type: 'expense',
          amount: 100,
          categoryId: 'food',
          accountId: 'cash',
          toAccountId: null,
          merchant: 'Coffee',
          note: undefined,
          date: '2026-07-01',
          time: '08:00',
          receipt: undefined,
          subscriptionId: null,
        },
        {
          id: 'later',
          type: 'expense',
          amount: 50,
          categoryId: 'food',
          accountId: 'cash',
          toAccountId: null,
          merchant: 'Snack',
          note: undefined,
          date: '2026-07-02',
          time: '08:00',
          receipt: undefined,
          subscriptionId: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'older',
          type: 'expense',
          amount: 300,
          categoryId: 'food',
          accountId: 'cash',
          toAccountId: null,
          merchant: 'Coffee',
          note: undefined,
          date: '2026-07-01',
          time: '08:00',
          receipt: undefined,
          subscriptionId: null,
        },
        {
          id: 'later',
          type: 'expense',
          amount: 50,
          categoryId: 'food',
          accountId: 'cash',
          toAccountId: null,
          merchant: 'Snack',
          note: undefined,
          date: '2026-07-02',
          time: '08:00',
          receipt: undefined,
          subscriptionId: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'later',
          type: 'expense',
          amount: 50,
          categoryId: 'food',
          accountId: 'cash',
          toAccountId: null,
          merchant: 'Snack',
          note: undefined,
          date: '2026-07-02',
          time: '08:00',
          receipt: undefined,
          subscriptionId: null,
        },
      ])

    await expect(service.listTransactions('user-1')).resolves.toEqual([
      expect.objectContaining({ id: 'later', balanceAfter: 850 }),
      expect.objectContaining({ id: 'older', balanceAfter: 900 }),
    ])
    await expect(service.listTransactions('user-1')).resolves.toEqual([
      expect.objectContaining({ id: 'later', balanceAfter: 650 }),
      expect.objectContaining({ id: 'older', balanceAfter: 700 }),
    ])
    await expect(service.listTransactions('user-1')).resolves.toEqual([
      expect.objectContaining({ id: 'later', balanceAfter: 950 }),
    ])
  })
})

describe('transactionsRouter', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    getSupabase.mockReset()
  })

  it('rejects future transaction dates', async () => {
    const response = await makeApp().request('/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'expense',
        amount: 1213,
        categoryId: 'cat-1',
        accountId: 'acc-1',
        merchant: 'AAA',
        date: tomorrowIsoDate(),
        receipt: null,
      }),
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Invalid request body',
      details: {
        fieldErrors: {
          date: ['Transaction date cannot be in the future'],
        },
      },
    })
  })

  it('orders same-day rows deterministically with time and created_at fallback', async () => {
    const client = buildClient({
      accounts: [
        {
          id: 'cash',
          owner_id: 'user-1',
          name: 'Cash',
          kind: 'cash',
          opening_balance: 1000,
          archived: false,
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      transactions: [
        makeTransactionRow({
          id: 'late-null-time',
          amount: 50,
          merchant: 'Null time late',
          tx_time: null,
          created_at: '2026-07-05T12:00:00.000Z',
        }),
        makeTransactionRow({
          id: 'early-time',
          amount: 100,
          merchant: 'Explicit early',
          tx_time: '09:00',
          created_at: '2026-07-05T09:30:00.000Z',
        }),
        makeTransactionRow({
          id: 'early-null-time',
          amount: 25,
          merchant: 'Null time early',
          tx_time: null,
          created_at: '2026-07-05T08:30:00.000Z',
        }),
      ],
    })
    getSupabase.mockReturnValue(client)

    const response = await makeApp().request('/transactions')

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: [
        expect.objectContaining({ id: 'late-null-time', balanceAfter: 825 }),
        expect.objectContaining({ id: 'early-time', balanceAfter: 875 }),
        expect.objectContaining({ id: 'early-null-time', balanceAfter: 975 }),
      ],
    })
    expect(client.transactionsBuilder.order).toHaveBeenNthCalledWith(1, 'tx_date', { ascending: true })
    expect(client.transactionsBuilder.order).toHaveBeenNthCalledWith(2, 'tx_time', { ascending: true })
    expect(client.transactionsBuilder.order).toHaveBeenNthCalledWith(3, 'created_at', { ascending: true })
    expect(client.transactionsBuilder.order).toHaveBeenNthCalledWith(4, 'id', { ascending: true })
  })
})

describe('transfer fees', () => {
  it('creates a positive transfer fee through the atomic repository operation', async () => {
    const created = {
      id: 'transfer-1', type: 'transfer' as const, amount: 100, categoryId: null,
      accountId: 'cash', toAccountId: 'bank', merchant: 'Transfer', note: undefined,
      date: '2026-07-05', time: undefined, receipt: undefined, subscriptionId: null, linkedTransferId: null,
    }
    const atomicCreate = vi.spyOn(repository, 'createTransferWithFee').mockResolvedValue(created)

    await expect(service.createTransaction('user-1', {
      type: 'transfer', amount: 100, fee: 10, categoryId: null, accountId: 'cash', toAccountId: 'bank',
      merchant: 'Transfer', date: '2026-07-05', receipt: null,
    })).resolves.toEqual(created)

    expect(atomicCreate).toHaveBeenCalledWith('user-1', expect.objectContaining({ type: 'transfer' }), 10)
  })
})
