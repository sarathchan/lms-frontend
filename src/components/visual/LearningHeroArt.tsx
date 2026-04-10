/** Inline SVG — learning / growth metaphor (not stock photography). */
export function LearningHeroArt({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="8" y="100" width="184" height="44" rx="8" className="fill-slate-200/80 dark:fill-slate-700/80" />
      <path
        d="M32 100V72c0-4 3-7 7-7h18l8-14c2-3 7-3 9 0l8 14h52c4 0 7 3 7 7v28"
        className="stroke-indigo-400 dark:stroke-indigo-500"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="100" cy="48" r="22" className="fill-indigo-500/20 stroke-indigo-600 dark:stroke-indigo-400" strokeWidth="2" />
      <path
        d="M100 38v20M90 48h20"
        className="stroke-indigo-600 dark:stroke-indigo-300"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <rect x="24" y="108" width="36" height="24" rx="4" className="fill-white dark:fill-slate-800 stroke-indigo-200 dark:stroke-slate-600" strokeWidth="1.5" />
      <rect x="82" y="108" width="36" height="24" rx="4" className="fill-indigo-50 dark:fill-indigo-950/50 stroke-indigo-300 dark:stroke-indigo-700" strokeWidth="1.5" />
      <rect x="140" y="108" width="36" height="24" rx="4" className="fill-white dark:fill-slate-800 stroke-indigo-200 dark:stroke-slate-600" strokeWidth="1.5" />
      <path d="M168 32l12 8-12 8" className="stroke-emerald-500" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="176" cy="28" r="4" className="fill-emerald-400" />
    </svg>
  )
}
