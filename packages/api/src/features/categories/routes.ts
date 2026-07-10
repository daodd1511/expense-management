import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AuthEnv } from '../../middleware/auth'
import { jsonError } from '../../lib/response'
import * as controller from './controller'
import { categoryCreateSchema, categoryListQuerySchema } from './schema'

export const categoriesRouter = new Hono<AuthEnv>()

categoriesRouter.get(
  '/',
  zValidator('query', categoryListQuerySchema, (result, c) => {
    if (!result.success) {
      return jsonError(c, 400, 'Invalid locale query parameter', z.flattenError(result.error))
    }
  }),
  async (c) => {
    const data = await controller.listCategories(c.get('userId'), c.req.valid('query').locale)
    return c.json({ data })
  },
)
categoriesRouter.post(
  '/',
  zValidator('json', categoryCreateSchema, (result, c) => {
    if (!result.success) {
      return jsonError(c, 400, 'Invalid request body', z.flattenError(result.error))
    }
  }),
  async (c) => {
    const data = await controller.createCategory(c.get('userId'), c.req.valid('json'))
    return c.json({ data }, 201)
  },
)
categoriesRouter.patch('/:id', controller.updateCategory)
categoriesRouter.delete('/:id', controller.deleteCategory)
