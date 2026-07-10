import { APP_COMMIT, APP_COMMIT_DATE, APP_VERSION } from '@/core/appVersion'

export function VersionPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-sm">
        <dt className="text-muted-foreground">version</dt>
        <dd>{APP_VERSION}</dd>
        <dt className="text-muted-foreground">commit</dt>
        <dd>{APP_COMMIT}</dd>
        <dt className="text-muted-foreground">deployed</dt>
        <dd>{APP_COMMIT_DATE}</dd>
      </dl>
    </div>
  )
}
