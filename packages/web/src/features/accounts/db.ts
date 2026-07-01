import { supabase } from '@/core/supabase'
import type { Account } from '@/core/types'
import { accountRowSchema, secureParse, type AccountRow } from '@wallet/shared'

// ---- Mapper ----

function toAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    openingBalance: row.opening_balance,
  }
}

function fromAccount(a: Omit<Account, 'id'>, ownerId: string) {
  return {
    owner_id: ownerId,
    name: a.name,
    kind: a.kind,
    opening_balance: a.openingBalance,
  }
}

// ---- Repository ----

export async function fetchAccounts(ownerId: string): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('archived', false)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? [])
    .map((row) => secureParse(accountRowSchema, row))
    .filter((a): a is AccountRow => a !== null)
    .map(toAccount)
}

export async function insertAccount(account: Omit<Account, 'id'>, ownerId: string): Promise<void> {
  const { error } = await supabase.from('accounts').insert(fromAccount(account, ownerId))
  if (error) throw error
}

export async function patchAccount(
  id: string,
  patch: Partial<Omit<Account, 'id'>>,
  ownerId: string,
): Promise<void> {
  const { error } = await supabase
    .from('accounts')
    .update({
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.kind !== undefined && { kind: patch.kind }),
      ...(patch.openingBalance !== undefined && { opening_balance: patch.openingBalance }),
    })
    .eq('id', id)
    .eq('owner_id', ownerId)
  if (error) throw error
}

export async function archiveAccount(id: string, ownerId: string): Promise<void> {
  const { error } = await supabase
    .from('accounts')
    .update({ archived: true })
    .eq('id', id)
    .eq('owner_id', ownerId)
  if (error) throw error
}
