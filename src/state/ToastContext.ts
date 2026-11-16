import { createContext, useContext } from 'react'

export type ToastContextValue = {
  /** Shows a short success message at the bottom of the screen; it hides itself after a few seconds. */
  showToast: (message: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
