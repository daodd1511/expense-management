import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/core/supabase'
import { toAppAuthError } from '@/features/auth/auth-errors'

export interface AuthContextValue {
  session: Session | null
  user: User | null
  signInWithGoogle: () => Promise<void>
  signInWithPassword: (params: { email: string; password: string }) => Promise<void>
  signUpWithPassword: (params: { email: string; password: string }) => Promise<void>
  requestPasswordReset: (params: { email: string }) => Promise<void>
  updatePassword: (params: { password: string }) => Promise<void>
  signOut: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    })

    if (error) throw toAppAuthError(error)
  }

  const signInWithPassword = async ({ email, password }: { email: string; password: string }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw toAppAuthError(error)
  }

  const signUpWithPassword = async ({ email, password }: { email: string; password: string }) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw toAppAuthError(error)
  }

  const requestPasswordReset = async ({ email }: { email: string }) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) throw toAppAuthError(error)
  }

  const updatePassword = async ({ password }: { password: string }) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw toAppAuthError(error)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        signInWithGoogle,
        signInWithPassword,
        signUpWithPassword,
        requestPasswordReset,
        updatePassword,
        signOut,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
