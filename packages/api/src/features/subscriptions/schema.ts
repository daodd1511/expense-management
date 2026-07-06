import { isoDateSchema, subscriptionCreateSchema, subscriptionPatchSchema } from '@wallet/shared'
import { z } from 'zod'

export { subscriptionCreateSchema, subscriptionPatchSchema }

export const logSubscriptionBodySchema = z.object({ today: isoDateSchema })
