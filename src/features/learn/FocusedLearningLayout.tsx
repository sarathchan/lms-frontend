import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { NeetTutorDock } from '../neet/NeetTutorDock'
import { AnimatePresence, motion } from 'framer-motion'
import { RouteLoadingFallback } from '../../components/feedback/RouteLoadingFallback'

function FocusedOutletFallback() {
  return <RouteLoadingFallback layout="focused" />
}

/** Focused chrome for learn / assessment (no main app sidebar). */
export function FocusedLearningLayout() {
  const loc = useLocation()
  return (
    <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)] antialiased transition-colors duration-200">
      <AnimatePresence mode="wait">
        <motion.div
          key={loc.pathname}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className="min-h-screen bg-[var(--bg)]"
        >
          <Suspense fallback={<FocusedOutletFallback />}>
            <Outlet />
          </Suspense>
          {loc.pathname.startsWith('/neet') && <NeetTutorDock />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
