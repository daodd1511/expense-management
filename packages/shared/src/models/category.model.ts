import { z } from 'zod'

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  color: z.string(),
  isSystem: z.boolean(),
})

export type Category = Readonly<z.infer<typeof categorySchema>>
