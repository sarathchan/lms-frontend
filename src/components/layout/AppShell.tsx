import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileDown,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Palette,
  PanelLeftClose,
  PanelLeft,
  School,
  Search,
  Settings,
  Sun,
  User,
  Users,
  UsersRound,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { api } from '../../lib/api'
import { Suspense, useEffect, useState } from 'react'
import clsx from 'clsx'
import { Button } from '../ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '../ui/sheet'
import { NotificationBell } from '../NotificationBell'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { useTheme } from '../../hooks/useTheme'
import { RouteLoadingFallback } from '../feedback/RouteLoadingFallback'
import { NeetTutorDock } from '../../features/neet/NeetTutorDock'

const SIDEBAR_KEY = 'mylms-sidebar-collapsed'

function OutletFallback() {
  return <RouteLoadingFallback layout="shell" />
}

const navCls = ({
  isActive,
  collapsed,
}: {
  isActive: boolean
  collapsed: boolean
}) =>
  clsx(
    'flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors duration-200',
    collapsed ? 'justify-center px-2' : 'px-3',
    isActive
      ? 'bg-[color-mix(in_srgb,var(--primary)_14%,var(--card))] text-[var(--primary)]'
      : 'text-[color-mix(in_srgb,var(--text)_88%,var(--muted))] hover:bg-[color-mix(in_srgb,var(--border)_55%,var(--card))]',
  )

function initialsFromUser(user: {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}) {
  const a = user.firstName?.trim()?.[0]
  const b = user.lastName?.trim()?.[0]
  if (a && b) return `${a}${b}`.toUpperCase()
  if (a) return a.toUpperCase()
  const e = user.email?.trim()?.[0]
  return e ? e.toUpperCase() : '?'
}

function AccountMenuDropdown({
  onLogout,
  compactTrigger,
}: {
  onLogout: () => void
  compactTrigger?: boolean
}) {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const { isDark, toggle } = useTheme()

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Account'
  const initials = user ? initialsFromUser(user) : '?'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={clsx(
            'h-9 gap-2 rounded-xl px-2 text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--muted)_14%,var(--card))]',
            !compactTrigger && 'sm:pl-2 sm:pr-3',
          )}
          aria-label="Account menu"
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] text-xs font-semibold text-[var(--primary)]"
            aria-hidden
          >
            {initials}
          </div>
          {!compactTrigger && (
            <span className="hidden max-w-[9rem] truncate text-left text-sm font-medium md:inline">
              {fullName}
            </span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-60">
        <div className="px-3 py-2.5">
          <p className="truncate text-sm font-semibold text-[var(--text)]">
            {fullName}
          </p>
          {user?.email && (
            <p className="truncate text-xs text-[var(--muted)]">{user.email}</p>
          )}
          {user?.role && (
            <p className="mt-1 text-xs font-medium capitalize text-[var(--muted)]">
              {user.role.replace(/_/g, ' ').toLowerCase()}
            </p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2"
          onSelect={() => navigate('/settings?tab=profile')}
        >
          <User className="h-4 w-4 shrink-0 opacity-80" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2"
          onSelect={() => navigate('/settings?tab=account')}
        >
          <Settings className="h-4 w-4 shrink-0 opacity-80" />
          Account &amp; security
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2"
          onSelect={() => navigate('/settings?tab=notifications')}
        >
          <Bell className="h-4 w-4 shrink-0 opacity-80" />
          Notifications
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2"
          onSelect={() => navigate('/settings?tab=preferences')}
        >
          <Palette className="h-4 w-4 shrink-0 opacity-80" />
          Appearance
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2" onSelect={() => toggle()}>
          {isDark ? (
            <Sun className="h-4 w-4 shrink-0 opacity-80" />
          ) : (
            <Moon className="h-4 w-4 shrink-0 opacity-80" />
          )}
          {isDark ? 'Light mode' : 'Dark mode'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
          onSelect={() => onLogout()}
        >
          <LogOut className="h-4 w-4 shrink-0 opacity-80" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppShell() {
  const loc = useLocation()
  const { user, logout, refreshToken, sessionId } = useAuthStore()
  const navigate = useNavigate()
  const { isDark, toggle } = useTheme()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1'
    } catch {
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  useEffect(() => {
    if (!user) return
    const id = window.setInterval(() => {
      void api
        .post('sessions/ping', sessionId ? { sessionId } : {})
        .catch(() => {})
    }, 120_000)
    void api.post('sessions/ping', sessionId ? { sessionId } : {}).catch(() => {})
    return () => clearInterval(id)
  }, [user, sessionId])

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await api.post('auth/logout', { refreshToken })
      }
    } catch {
      /* ignore */
    }
    logout()
    navigate('/login', { replace: true })
  }

  const isStaff =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN' ||
    user?.role === 'INSTRUCTOR'

  const sidebarW = collapsed ? 'w-[4.25rem]' : 'w-60'

  const NavItems = ({
    onNavigate,
    collapsed: col,
  }: {
    onNavigate?: () => void
    collapsed?: boolean
  }) => {
    const c = col ?? collapsed
    return (
      <>
        {isStaff && (
          <NavLink
            to="/"
            end
            className={(p) => navCls({ ...p, collapsed: c })}
            onClick={onNavigate}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0 text-[var(--primary)]" />
            {!c && 'Dashboard'}
          </NavLink>
        )}
        <NavLink
          to="/courses"
          className={(p) => navCls({ ...p, collapsed: c })}
          onClick={onNavigate}
        >
          <BookOpen className="h-4 w-4 shrink-0 text-[var(--primary)]" />
          {!c && 'Courses'}
        </NavLink>
        {!isStaff && (
          <NavLink
            to="/learn"
            className={(p) => navCls({ ...p, collapsed: c })}
            onClick={onNavigate}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0 text-[var(--primary)]" />
            {!c && 'Dashboard'}
          </NavLink>
        )}
        {!isStaff && (
          <NavLink
            to="/my-attendance"
            className={(p) => navCls({ ...p, collapsed: c })}
            onClick={onNavigate}
          >
            <CalendarDays className="h-4 w-4 shrink-0 text-[var(--primary)]" />
            {!c && 'Attendance'}
          </NavLink>
        )}
        <NavLink
          to="/communication"
          className={(p) => navCls({ ...p, collapsed: c })}
          onClick={onNavigate}
        >
          <MessageSquare className="h-4 w-4 shrink-0 text-[var(--primary)]" />
          {!c && 'Communication'}
        </NavLink>
        {isStaff && (
          <NavLink
            to="/reports"
            className={(p) => navCls({ ...p, collapsed: c })}
            onClick={onNavigate}
          >
            <FileDown className="h-4 w-4 shrink-0 text-[var(--primary)]" />
            {!c && 'Reports'}
          </NavLink>
        )}
        <NavLink
          to="/settings"
          className={(p) => navCls({ ...p, collapsed: c })}
          onClick={onNavigate}
        >
          <Settings className="h-4 w-4 shrink-0 text-[var(--primary)]" />
          {!c && 'Settings'}
        </NavLink>
        {isStaff && (
          <>
            <NavLink
              to="/users"
              className={(p) => navCls({ ...p, collapsed: c })}
              onClick={onNavigate}
            >
              <Users className="h-4 w-4 shrink-0 text-[var(--primary)]" />
              {!c && 'Users'}
            </NavLink>
            <NavLink
              to="/teams"
              className={(p) => navCls({ ...p, collapsed: c })}
              onClick={onNavigate}
            >
              <UsersRound className="h-4 w-4 shrink-0 text-[var(--primary)]" />
              {!c && 'Teams'}
            </NavLink>
            <NavLink
              to="/search"
              className={(p) => navCls({ ...p, collapsed: c })}
              onClick={onNavigate}
            >
              <Search className="h-4 w-4 shrink-0 text-[var(--primary)]" />
              {!c && 'Search'}
            </NavLink>
            <NavLink
              to="/programs"
              className={(p) => navCls({ ...p, collapsed: c })}
              onClick={onNavigate}
            >
              <School className="h-4 w-4 shrink-0 text-[var(--primary)]" />
              {!c && 'Programs'}
            </NavLink>
            <NavLink
              to="/questions"
              className={(p) => navCls({ ...p, collapsed: c })}
              onClick={onNavigate}
            >
              <ClipboardList className="h-4 w-4 shrink-0 text-[var(--primary)]" />
              {!c && 'Question bank'}
            </NavLink>
            <NavLink
              to="/attendance"
              className={(p) => navCls({ ...p, collapsed: c })}
              onClick={onNavigate}
            >
              <CalendarDays className="h-4 w-4 shrink-0 text-[var(--primary)]" />
              {!c && 'Attendance'}
            </NavLink>
          </>
        )}
      </>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] md:flex-row">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-[var(--border)] bg-[var(--sidebar)] px-3 transition-colors duration-200 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pt-12">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex flex-col gap-1 p-3">
              <div className="mb-4 flex items-center gap-2 px-2">
                <GraduationCap className="h-8 w-8 text-[var(--primary)]" />
                <span className="font-semibold text-[var(--text)]">MYLMS</span>
              </div>
              <NavItems onNavigate={() => setMobileOpen(false)} collapsed={false} />
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex flex-1 items-center justify-center">
          <span className="font-semibold text-[var(--text)]">MYLMS</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <NotificationBell />
          <AccountMenuDropdown
            compactTrigger
            onLogout={() => void handleLogout()}
          />
        </div>
      </header>

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 hidden shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar)] transition-[width,background-color,border-color] duration-200 md:flex',
          sidebarW,
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-[var(--border)] px-3">
          <GraduationCap className="h-8 w-8 shrink-0 text-[var(--primary)]" />
          {!collapsed && (
            <span className="truncate font-semibold tracking-tight text-[var(--text)]">
              MYLMS
            </span>
          )}
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          <NavItems />
        </nav>
        <div className="border-t border-[var(--border)] p-2">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size={collapsed ? 'icon' : 'default'}
              className={clsx('min-w-0 flex-1', !collapsed && 'justify-start')}
              onClick={() => setCollapsed((x) => !x)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <>
                  <PanelLeftClose className="h-4 w-4" />
                  <span className="ml-2">Collapse</span>
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => toggle()}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </aside>

      <div
        className={clsx(
          'flex min-h-screen flex-1 flex-col bg-[var(--bg)] transition-[margin] duration-200 md:ml-60',
          collapsed && 'md:ml-[4.25rem]',
        )}
      >
        <header className="sticky top-0 z-20 hidden h-14 items-center justify-end gap-1 border-b border-[var(--border)] bg-[var(--card)] px-4 transition-colors duration-200 sm:px-6 md:flex">
          <NotificationBell />
          <AccountMenuDropdown onLogout={() => void handleLogout()} />
        </header>
        <main className="flex-1 bg-[var(--bg)] p-4 transition-colors duration-200 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <Suspense fallback={<OutletFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
      {isStaff && loc.pathname.startsWith('/neet') && <NeetTutorDock />}
    </div>
  )
}
