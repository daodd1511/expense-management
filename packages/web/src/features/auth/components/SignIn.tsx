import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AppAuthError } from '@/features/auth/auth-errors'
import { useAuth } from '@/features/auth/auth'
import { useLang } from '@/core/i18n'
import { FormErrorBanner } from '@/shared/components/FormErrorBanner'
import { Button } from '@/shared/components/ui/button'
import { Input, Label } from '@/shared/components/ui/input'
import { AuthCardLayout } from './AuthCardLayout'

export function SignIn({ redirectTo }: { redirectTo: string }) {
  const { signInWithGoogle, signInWithPassword, user, loading } = useAuth()
  const { t } = useLang()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPasswordSigningIn, setIsPasswordSigningIn] = useState(false)
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      void navigate({ href: redirectTo, replace: true })
    }
  }, [loading, navigate, redirectTo, user])

  const handlePasswordSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setIsPasswordSigningIn(true)

    try {
      await signInWithPassword({ email, password })
    } catch (error) {
      const authError = error instanceof AppAuthError ? error : new AppAuthError('auth.errorGeneric')
      setErrorMessage(t(authError.translationKey))
    } finally {
      setIsPasswordSigningIn(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setErrorMessage(null)
    setIsGoogleSigningIn(true)

    try {
      await signInWithGoogle()
    } catch (error) {
      const authError = error instanceof AppAuthError ? error : new AppAuthError('auth.errorGeneric')
      setErrorMessage(t(authError.translationKey))
      setIsGoogleSigningIn(false)
    }
  }

  return (
    <AuthCardLayout
      title={t('auth.signInTitle')}
      subtitle={t('auth.signInSubtitle')}
      footerLinks={[
        { to: '/auth/sign-up', label: t('auth.noAccount') },
      ]}
    >
      <form className="space-y-4" onSubmit={handlePasswordSignIn}>
        <div className="space-y-1.5">
          <Label htmlFor="sign-in-email">{t('auth.email')}</Label>
          <Input
            id="sign-in-email"
            type="email"
            value={email}
            autoComplete="email"
            placeholder={t('auth.emailPlaceholder')}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="sign-in-password">{t('auth.password')}</Label>
            <Link to="/auth/forgot-password" className="text-xs font-medium text-primary hover:underline">
              {t('auth.forgotPassword')}
            </Link>
          </div>
          <Input
            id="sign-in-password"
            type="password"
            value={password}
            autoComplete="current-password"
            placeholder={t('auth.passwordPlaceholder')}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
          />
        </div>

        {errorMessage && <FormErrorBanner message={errorMessage} />}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={isPasswordSigningIn}
          loadingLabel={t('auth.signingIn')}
        >
          {t('auth.signIn')}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t('auth.orContinueWith')}
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        loading={isGoogleSigningIn}
        loadingLabel={t('auth.signingIn')}
        onClick={handleGoogleSignIn}
        className="h-auto w-full rounded-xl bg-card px-6 py-3.5 shadow-sm hover:bg-muted"
      >
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        {t('auth.signInWithGoogle')}
      </Button>
    </AuthCardLayout>
  )
}
