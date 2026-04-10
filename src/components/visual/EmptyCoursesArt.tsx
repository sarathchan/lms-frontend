export function EmptyCoursesArt({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="48"
        y="48"
        width="104"
        height="88"
        rx="8"
        className="fill-slate-100 dark:fill-slate-800/80 stroke-slate-300 dark:stroke-slate-600"
        strokeWidth="2"
      />
      <path
        d="M64 64h72v6H64zm0 16h52v6H64zm0 16h64v6H64z"
        className="fill-slate-300 dark:fill-slate-600"
      />
      <circle cx="152" cy="40" r="20" className="fill-indigo-100 dark:fill-indigo-900/50 stroke-indigo-400" strokeWidth="2" />
      <path d="M152 32v16M144 40h16" className="stroke-indigo-600 dark:stroke-indigo-400" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
