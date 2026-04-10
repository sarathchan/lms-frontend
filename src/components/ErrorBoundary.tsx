import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type S = { hasError: boolean; message?: string }

export class ErrorBoundary extends Component<Props, S> {
  state: S = { hasError: false }

  static getDerivedStateFromError(err: Error): S {
    return { hasError: true, message: err.message }
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('MYLMS ErrorBoundary', err, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            Something went wrong
          </h1>
          <p className="max-w-md text-center text-slate-600 dark:text-slate-400">
            {this.state.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            type="button"
            className="rounded-lg bg-mylms-600 px-4 py-2 text-sm font-medium text-white hover:bg-mylms-500"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
