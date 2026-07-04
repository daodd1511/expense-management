import { useAuth } from '@/features/auth/auth'
import { LoadingScreen } from '@/shared/components/LoadingScreen'
import { SignIn } from '@/features/auth/components/SignIn'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return <LoadingScreen />

  if (!user) return <SignIn />

  return <>{children}</>
}
