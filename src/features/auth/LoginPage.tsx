import { zodResolver } from '@hookform/resolvers/zod'
import { lazy, Suspense, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock } from 'lucide-react'
import axios from 'axios'
import { toast } from 'sonner'
import { getApiBaseUrl } from '../../lib/apiConfig'
import { z } from 'zod'
import { useAuthStore, type AuthUser } from '../../stores/authStore'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { LottieLoader } from '../../components/feedback/LottieLoader'

const LoginHeroLottie = lazy(() =>
  import('../../components/visual/LoginHeroLottie').then((m) => ({
    default: m.LoginHeroLottie,
  })),
)

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()
  const [showAnimation, setShowAnimation] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => setShowAnimation(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    let stored: string | null = null
    try {
      stored = localStorage.getItem('mylms-theme')
    } catch {
      /* ignore */
    }
    const wasDark = stored === 'dark'
    document.documentElement.classList.remove('dark')
    return () => {
      if (wasDark) document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
    }
  }, [])

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const loading = form.formState.isSubmitting

  const submit = form.handleSubmit(async (values) => {
    try {
      const { data } = await axios.post<{
        accessToken: string
        refreshToken: string
        sessionId?: string
        user: Omit<AuthUser, 'studentProfile'>
        studentProfile?: {
          activeExamType: {
            id: string
            name: string
            slug: string
          } | null
          examSelections: { examType: { id: string; name: string; slug: string } }[]
        } | null
      }>(`${getApiBaseUrl()}/auth/login`, {
        email: values.email,
        password: values.password,
      })
      const sp = data.studentProfile
      const user: AuthUser = {
        ...data.user,
        studentProfile: sp
          ? {
              activeExamType: sp.activeExamType ?? null,
              examTypes: sp.examSelections?.map((s) => s.examType) ?? [],
            }
          : null,
      }
      setAuth({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user,
        sessionId: data.sessionId,
      })
      toast.success('Signed in successfully')
      const staff = ['SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR'].includes(
        data.user.role,
      )
      navigate(staff ? '/' : '/learn', { replace: true })
    } catch {
      toast.error('Incorrect email or password. Try again or use “Get help”.')
    }
  })

  return (
    <div className="mylms-login-root relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50/50 to-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 18%, rgb(199 210 254 / 0.55) 0%, transparent 42%), radial-gradient(circle at 88% 12%, rgb(165 180 252 / 0.4) 0%, transparent 38%), radial-gradient(circle at 72% 88%, rgb(224 231 255 / 0.65) 0%, transparent 45%)',
        }}
      />

      <div className="relative z-10 grid min-h-screen grid-cols-1 items-stretch lg:grid-cols-2">
        {/* Form — left on large screens; full width column on mobile */}
        <div className="flex items-center justify-center px-4 py-10 sm:px-8 lg:py-12">
          <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200/90 bg-white/95 p-8 shadow-xl shadow-indigo-950/[0.08] ring-1 ring-slate-900/[0.04] backdrop-blur-md sm:p-10">
            <div className="mb-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">
                MYLMS
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                Sign in
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Email and password from your organization
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-slate-700">
                  Email
                </Label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@organization.org"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/25"
                  {...form.register('email')}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-slate-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/90 py-3 pl-10 pr-12 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/25"
                    {...form.register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3 pt-1">
                <Button
                  type="submit"
                  size="lg"
                  className="h-12 w-full rounded-xl bg-indigo-600 text-base font-semibold shadow-md shadow-indigo-600/25 hover:bg-indigo-500"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="inline-flex items-center justify-center gap-2.5">
                      <LottieLoader size={32} aria-hidden />
                      Signing in…
                    </span>
                  ) : (
                    'Sign in'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-12 w-full rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  onClick={() =>
                    toast.message('Get help signing in', {
                      description:
                        'Ask your administrator or instructor for an account, an invitation, or a password reset.',
                    })
                  }
                >
                  Get help signing in
                </Button>
              </div>
            </form>

            {import.meta.env.DEV && (
              <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-400 sm:text-xs">
                <span className="font-medium text-slate-500">
                  Local development
                </span>
                <span className="mx-1 text-slate-300">·</span>
                Try{' '}
                <span className="font-mono text-slate-500">
                  student@mylms.dev
                </span>{' '}
                /{' '}
                <span className="font-mono text-slate-500">Password123!</span>
              </p>
            )}
          </div>
        </div>

        {/* Illustration — right on desktop only; decoupled from form state */}
        <div className="hidden min-h-0 flex-col justify-center border-slate-200/80 bg-gradient-to-br from-indigo-100/70 via-indigo-50/40 to-white px-6 py-10 sm:px-10 sm:py-12 lg:flex lg:border-l lg:py-16">
          <div className="mx-auto w-full max-w-[min(100%,400px)]">
            {showAnimation && (
              <Suspense
                fallback={
                  <div
                    className="mx-auto aspect-square w-full max-w-[min(100%,360px)] rounded-2xl bg-indigo-100/40"
                    aria-hidden
                  />
                }
              >
                <LoginHeroLottie className="opacity-[0.98]" />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
