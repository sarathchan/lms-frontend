import { Link, useLocation } from 'react-router-dom'
import { cn } from '../../lib/utils'

const links = [
  { to: '/communication/questions', label: 'Question pool' },
  { to: '/communication/tests', label: 'Test management' },
  { to: '/communication/assign', label: 'Assign test' },
] as const

export function CommunicationStaffNav() {
  const { pathname } = useLocation()
  return (
    <nav
      className="mb-8 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-2 dark:border-slate-700 dark:bg-slate-900/40"
      aria-label="Communication staff sections"
    >
      {links.map(({ to, label }) => {
        const active = pathname === to || pathname.startsWith(`${to}/`)
        return (
          <Link
            key={to}
            to={to}
            className={cn(
              'rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-800 dark:text-indigo-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
            )}
          >
            {label}
          </Link>
        )
      })}
      <Link
        to="/communication"
        className="ml-auto rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-200"
      >
        Learner view
      </Link>
    </nav>
  )
}
