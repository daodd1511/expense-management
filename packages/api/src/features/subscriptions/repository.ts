import {
  fromSubscription,
  subscriptionPatchToRow,
  subscriptionRowSchema,
  toSubscription,
  transactionRowSchema,
  type Database,
  type Subscription,
  type SubscriptionCreate,
  type SubscriptionPatch,
} from '@wallet/shared'
import { getSupabase } from '../../config/supabase'
import { parseRows } from '../../lib/response'
import { ApiError } from '../../middleware/error'

type LogSubscriptionRpcRow = Database['public']['Functions']['log_subscription']['Returns'][number]

function parseSubscriptionRow(data: unknown, message: string): Subscription {
  const result = subscriptionRowSchema.safeParse(data)
  if (!result.success) {
    throw new ApiError(500, message, result.error.flatten())
  }

  return toSubscription(result.data)
}

export async function listSubscriptions(userId: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return parseRows(data, subscriptionRowSchema, toSubscription)
}

export async function createSubscription(userId: string, subscription: Omit<Subscription, 'id'>) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('subscriptions')
    .insert(fromSubscription({ subscription, ownerId: userId }))
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return parseSubscriptionRow(data, 'Inserted subscription failed validation')
}

export async function loadSubscription(userId: string, id: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', id)
    .eq('owner_id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ? parseSubscriptionRow(data, 'Stored subscription failed validation') : null
}

export async function loadSubscriptionSchedule(userId: string, id: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('subscriptions')
    .select('day_of_month, month_of_year, cadence')
    .eq('id', id)
    .eq('owner_id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function logSubscription(params: {
  userId: string
  subscription: Subscription
  today: string
  nextDueDate: string
}) {
  const supabase = getSupabase()
  const rpc = await supabase
    .rpc('log_subscription', {
      p_owner_id: params.userId,
      p_subscription_id: params.subscription.id,
      p_type: params.subscription.type,
      p_amount: params.subscription.amount,
      p_category_id: params.subscription.categoryId,
      p_account_id: params.subscription.accountId,
      p_merchant: params.subscription.name,
      p_note: params.subscription.note ?? null,
      p_tx_date: params.today,
      p_next_due_date: params.nextDueDate,
    })
    .single<LogSubscriptionRpcRow>()

  if (rpc.error) {
    throw rpc.error
  }
  if (!rpc.data) {
    return null
  }

  const txRow = transactionRowSchema.safeParse({
    id: rpc.data.tx_id,
    owner_id: rpc.data.tx_owner_id,
    type: rpc.data.tx_type,
    amount: rpc.data.tx_amount,
    category_id: rpc.data.tx_category_id,
    account_id: rpc.data.tx_account_id,
    to_account_id: rpc.data.tx_to_account_id,
    merchant: rpc.data.tx_merchant,
    note: rpc.data.tx_note,
    tx_date: rpc.data.tx_tx_date,
    tx_time: null,
    receipt_url: rpc.data.tx_receipt_url,
    subscription_id: rpc.data.tx_subscription_id,
    created_at: rpc.data.tx_created_at,
  })
  if (!txRow.success) {
    throw new ApiError(500, 'Logged transaction failed validation', txRow.error.flatten())
  }

  return parseSubscriptionRow(
    {
      id: rpc.data.sub_id,
      owner_id: rpc.data.sub_owner_id,
      name: rpc.data.sub_name,
      amount: rpc.data.sub_amount,
      type: rpc.data.sub_type,
      category_id: rpc.data.sub_category_id,
      account_id: rpc.data.sub_account_id,
      cadence: rpc.data.sub_cadence,
      day_of_month: rpc.data.sub_day_of_month,
      month_of_year: rpc.data.sub_month_of_year,
      next_due_date: rpc.data.sub_next_due_date,
      note: rpc.data.sub_note,
      active: rpc.data.sub_active,
      created_at: rpc.data.sub_created_at,
    },
    'Updated subscription failed validation',
  )
}

export async function updateSubscription(
  userId: string,
  id: string,
  row: ReturnType<typeof subscriptionPatchToRow> & { next_due_date?: string },
) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('subscriptions')
    .update(row)
    .eq('id', id)
    .eq('owner_id', userId)
    .select('*')
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ? parseSubscriptionRow(data, 'Updated subscription failed validation') : null
}

export async function deleteSubscription(userId: string, id: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', id)
    .eq('owner_id', userId)
    .select('id')
    .maybeSingle()

  if (error) {
    throw error
  }

  return Boolean(data)
}

export { subscriptionPatchToRow }
