import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { MessageCircle, Send, X } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { cn } from '../../lib/utils'

type Msg = { role: 'user' | 'assistant'; content: string }

export function NeetTutorDock() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content:
        'Hi! I can explain syllabus concepts, why an option is wrong, or suggest how to revise. What should we tackle?',
    },
  ])

  const chat = useMutation({
    mutationFn: async (next: Msg[]) => {
      const { data } = await api.post<{ reply: string }>('neet/tutor/chat', {
        messages: next.map((m) => ({ role: m.role, content: m.content })),
      })
      return data.reply
    },
    onSuccess: (reply) => {
      setMessages((m) => [...m, { role: 'assistant', content: reply }])
    },
    onError: () => toast.error('Tutor unavailable. Check OPENAI_API_KEY on the server.'),
  })

  const send = () => {
    const t = input.trim()
    if (!t || chat.isPending) return
    const userMsg: Msg = { role: 'user', content: t }
    const thread: { role: 'user' | 'assistant'; content: string }[] = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: t },
    ]
    setMessages((m) => [...m, userMsg])
    setInput('')
    chat.mutate(thread as Msg[])
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105',
          'bg-[var(--primary)] text-white',
          open && 'pointer-events-none opacity-0',
        )}
        aria-label="Open NEET tutor"
      >
        <MessageCircle className="h-7 w-7" />
      </button>

      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 flex w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl"
          role="dialog"
          aria-label="NEET AI tutor"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--text)]">NEET tutor</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="max-h-72 space-y-3 overflow-y-auto px-4 py-3 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-xl px-3 py-2',
                  m.role === 'user'
                    ? 'ml-4 bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] text-[var(--text)]'
                    : 'mr-2 bg-[color-mix(in_srgb,var(--muted)_12%,transparent)] text-[var(--text)]',
                )}
              >
                {m.content}
              </div>
            ))}
            {chat.isPending && (
              <p className="text-xs text-[var(--muted)]">Thinking…</p>
            )}
          </div>
          <div className="flex gap-2 border-t border-[var(--border)] p-3">
            <input
              className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
              placeholder="Ask a doubt…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <Button
              type="button"
              size="icon"
              className="shrink-0 rounded-xl"
              disabled={chat.isPending}
              onClick={send}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
