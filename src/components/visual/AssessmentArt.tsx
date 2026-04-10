export function AssessmentIntroArt({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 180 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="20" y="24" width="140" height="92" rx="12" className="fill-indigo-50 dark:fill-indigo-950/40 stroke-indigo-200 dark:stroke-indigo-800" strokeWidth="2" />
      <circle cx="90" cy="58" r="18" className="stroke-indigo-600 dark:stroke-indigo-400" strokeWidth="2.5" />
      <path d="M82 58h16M90 50v16" className="stroke-indigo-600 dark:stroke-indigo-400" strokeWidth="2" strokeLinecap="round" />
      <rect x="44" y="88" width="92" height="8" rx="4" className="fill-indigo-200/80 dark:fill-indigo-800/60" />
      <rect x="44" y="102" width="64" height="8" rx="4" className="fill-slate-200 dark:fill-slate-700" />
    </svg>
  )
}

export function SuccessCelebrationArt({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 160 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="80" cy="56" r="36" className="fill-emerald-100 dark:fill-emerald-950/50 stroke-emerald-500" strokeWidth="2" />
      <path
        d="M64 56l10 10 22-24"
        className="stroke-emerald-600 dark:stroke-emerald-400"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M24 88c12-8 28-12 56-12s44 4 56 12" className="stroke-emerald-400/60" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function EncourageRetryArt({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 160 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="80" cy="52" r="32" className="fill-sky-50 dark:fill-sky-950/40 stroke-sky-400" strokeWidth="2" />
      <path
        d="M68 52h24M80 40v24"
        className="stroke-sky-600 dark:stroke-sky-400"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M40 96h80" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 6" />
    </svg>
  )
}
