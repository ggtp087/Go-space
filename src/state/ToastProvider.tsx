import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ToastContext, type ToastContextValue } from './ToastContext'

const TOAST_DURATION_MS = 3500

export function ToastProvider({ children }: { children: ReactNode }) {
  // `id` changes on every showToast, so the same message twice in a row
  // still restarts the timer.
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null)

  const showToast = useCallback((message: string) => setToast({ id: Date.now(), message }), [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), TOAST_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [toast])

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Always mounted, so screen readers pick up the message when it's inserted. */}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[1100] flex justify-center px-4">
        {toast && (
          <div
            key={toast.id}
            className="flex items-center gap-2 rounded-[10px] bg-green-800 px-4 py-2.5 text-[13px] font-semibold text-white shadow-card-lg"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}
