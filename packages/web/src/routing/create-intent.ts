export type CreateIntentSearch = {
  create?: string
}

/**
 * A `create` token in the URL is a one-shot signal for the destination page to open its
 * "add" form (used by the command palette's "New account/budget/subscription" actions,
 * since those pages have no dedicated `/new` route the way transactions does). The page
 * consumes the token via `createIntentToken` and clears it from the URL once handled.
 */
export function validateCreateIntentSearch(search: Record<string, unknown>): CreateIntentSearch {
  return {
    create: typeof search.create === 'string' ? search.create : undefined,
  }
}
