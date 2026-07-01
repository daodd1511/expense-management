import { useAuth } from '@/features/auth/auth'
import { SignIn } from '@/features/auth/components/SignIn'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return <SignIn />

  return <>{children}</>
}
