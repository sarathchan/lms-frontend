import { useMemo } from 'react'
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, addDays } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import './attendance-calendar.css'

const locales = { 'en-US': enUS }

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (d: Date) => startOfWeek(d, { weekStartsOn: 1 }),
  getDay,
  locales,
})

export type CalendarEventApi = {
  id?: string
  date?: string
  /** Inclusive YYYY-MM-DD (org events spanning one or more days). */
  startDate?: string
  endDate?: string
  title: string
  color: string
  kind?: 'attendance' | 'org_event'
  body?: string | null
}

type CalEv = {
  title: string
  start: Date
  end: Date
  allDay: boolean
  resource?: string
}

export function AttendanceCalendar({
  events,
  defaultView = 'month',
}: {
  events: CalendarEventApi[]
  defaultView?: View
}) {
  const calEvents: CalEv[] = useMemo(() => {
    const out: CalEv[] = []
    for (const e of events) {
      if (e.startDate && e.endDate) {
        const start = new Date(`${e.startDate}T12:00:00.000Z`)
        const lastInclusive = new Date(`${e.endDate}T12:00:00.000Z`)
        const endExclusive = addDays(lastInclusive, 1)
        out.push({
          title: e.title,
          start,
          end: endExclusive,
          allDay: true,
          resource: e.color,
        })
      } else if (e.date) {
        const t = new Date(`${e.date}T12:00:00.000Z`)
        out.push({
          title: e.title,
          start: t,
          end: t,
          allDay: true,
          resource: e.color,
        })
      }
    }
    return out
  }, [events])

  return (
    <div className="lms-rbc h-[560px] rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 transition-colors duration-200">
      <Calendar
        localizer={localizer}
        events={calEvents}
        startAccessor="start"
        endAccessor="end"
        defaultView={defaultView}
        views={['month', 'week', 'agenda']}
        culture="en-US"
        eventPropGetter={(ev) => {
          const c = (ev as CalEv).resource
          let bg: string
          let fg = '#fff'
          if (c === 'green') bg = 'var(--chart-green)'
          else if (c === 'yellow') bg = 'var(--chart-amber)'
          else if (c === 'indigo') {
            bg = 'var(--primary)'
            fg = '#fff'
          } else bg = 'var(--chart-red)'
          return {
            style: {
              backgroundColor: bg,
              borderRadius: '8px',
              color: fg,
              border: 'none',
            },
          }
        }}
      />
    </div>
  )
}
