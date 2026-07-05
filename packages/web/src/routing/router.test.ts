import { describe, expect, it } from 'vitest'
import { router } from './router'

describe('router', () => {
  it('builds the route tree without route id/path invariants', () => {
    expect(router.routesByPath['/']).toBeDefined()
    expect(router.routesByPath['/transactions/new']).toBeDefined()
    expect(router.routesByPath['/transactions/$transactionId/edit']).toBeDefined()
  })
})
