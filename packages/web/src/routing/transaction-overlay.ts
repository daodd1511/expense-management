import { normalizeRedirectPath } from './auth-redirect'

export type TransactionOverlaySearch = {
  returnTo?: string
}

export type TransactionOverlayState =
  | {
      mode: 'create'
      returnTo: string
      returnToPathname: string
    }
  | {
      mode: 'edit'
      transactionId: string
      returnTo: string
      returnToPathname: string
    }

const TRANSACTION_OVERLAY_FALLBACK = '/transactions'

function getPathnameFromHref(href: string): string {
  try {
    return new URL(href, 'http://localhost').pathname || '/'
  } catch {
    return '/'
  }
}

function isTransactionOverlayPath(pathname: string): boolean {
  return pathname === '/transactions/new' || /^\/transactions\/[^/]+\/edit$/.test(pathname)
}

export function normalizeTransactionReturnTo(value: string | undefined): string {
  const normalized = normalizeRedirectPath(value)
  const pathname = getPathnameFromHref(normalized)

  if (pathname === '/auth' || pathname.startsWith('/auth/')) {
    return TRANSACTION_OVERLAY_FALLBACK
  }

  if (isTransactionOverlayPath(pathname)) {
    return TRANSACTION_OVERLAY_FALLBACK
  }

  return normalized
}

export function validateTransactionOverlaySearch(search: Record<string, unknown>): TransactionOverlaySearch {
  return {
    returnTo:
      typeof search.returnTo === 'string'
        ? normalizeTransactionReturnTo(search.returnTo)
        : undefined,
  }
}

export function getTransactionOverlayState(
  pathname: string,
  search: Record<string, unknown>,
): TransactionOverlayState | null {
  const { returnTo } = validateTransactionOverlaySearch(search)
  const normalizedReturnTo = normalizeTransactionReturnTo(returnTo)
  const returnToPathname = getPathnameFromHref(normalizedReturnTo)

  if (pathname === '/transactions/new') {
    return {
      mode: 'create',
      returnTo: normalizedReturnTo,
      returnToPathname,
    }
  }

  const editMatch = pathname.match(/^\/transactions\/([^/]+)\/edit$/)

  if (!editMatch) {
    return null
  }

  return {
    mode: 'edit',
    transactionId: decodeURIComponent(editMatch[1]),
    returnTo: normalizedReturnTo,
    returnToPathname,
  }
}
