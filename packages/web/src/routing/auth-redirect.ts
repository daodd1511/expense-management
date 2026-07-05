export type AuthSearch = {
  redirect?: string
}

export function normalizeRedirectPath(value: string | undefined): string {
  if (!value) return '/'

  try {
    const url = new URL(value, window.location.origin)
    if (url.origin !== window.location.origin) return '/'
    return `${url.pathname}${url.search}${url.hash}` || '/'
  } catch {
    return '/'
  }
}

export function validateAuthSearch(search: Record<string, unknown>): AuthSearch {
  return {
    redirect: typeof search.redirect === 'string' ? normalizeRedirectPath(search.redirect) : undefined,
  }
}

export function currentRedirectPath(): string {
  if (typeof window === 'undefined') return '/'
  return `${window.location.pathname}${window.location.search}${window.location.hash}` || '/'
}
