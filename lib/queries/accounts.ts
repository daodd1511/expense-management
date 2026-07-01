import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import type { Account } from '@/lib/types'
import type { Database } from '@/lib/database.types'

type AccountRow = Database['public']['Tables']['accounts']['Row']

function toAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    openingBalance: row.opening_balance,
  }
}

export function useAccounts() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['accounts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('owner_id', user!.id)
        .eq('archived', false)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data.map(toAccount)
    },
    enabled: !!user,
  })
}

export function useAddAccount() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (a: Omit<Account, 'id'>) => {
      const { error } = await supabase.from('accounts').insert({
        owner_id: user!.id,
        name: a.name,
        kind: a.kind,
        opening_balance: a.openingBalance,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts', user?.id] }),
  })
}

export function useUpdateAccount() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Omit<Account, 'id'>> }) => {
      const { error } = await supabase
        .from('accounts')
        .update({
          ...(patch.name !== undefined && { name: patch.name }),
          ...(patch.kind !== undefined && { kind: patch.kind }),
          ...(patch.openingBalance !== undefined && { opening_balance: patch.openingBalance }),
        })
        .eq('id', id)
        .eq('owner_id', user!.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts', user?.id] }),
  })
}

export function useDeleteAccount() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('accounts')
        .update({ archived: true })
        .eq('id', id)
        .eq('owner_id', user!.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts', user?.id] }),
  })
}
