'use client'

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { X } from 'lucide-react'

/**
 * A tiny toast/notification system — no dependency. Actions raise a transient
 * notice ("Removed X — Undo") through `useToast().toast(...)`; each auto-dismisses
 * after a few seconds, and an optional action (Undo) fires then closes it.
 *
 * The live region is aria-live="polite" so screen readers announce a notice
 * without stealing focus. No enter/exit animation, so there's nothing to gate
 * behind prefers-reduced-motion (§10). Square + token colors (§9).
 */
type ToastAction = { label: string; onClick: () => void }
type Toast = { id: number; message: string; action?: ToastAction }

const ToastContext = createContext<{
  toast: (message: string, action?: ToastAction) => void
} | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

const DURATION_MS = 6000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  // A monotonic counter, not Math.random (purity) or Date.now.
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, action?: ToastAction) => {
      const id = (nextId.current += 1)
      setToasts((prev) => [...prev, { id, message, action }])
      setTimeout(() => dismiss(id), DURATION_MS)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center p-4"
        role="region"
        aria-label="Notifications"
      >
        <ul aria-live="polite" className="flex w-full max-w-sm flex-col gap-2">
          {toasts.map((toast) => (
            <li
              key={toast.id}
              className="border-primary bg-background pointer-events-auto flex items-center justify-between gap-3 border-2 px-4 py-3 text-sm"
            >
              <span className="text-foreground">{toast.message}</span>
              <div className="flex shrink-0 items-center gap-3">
                {toast.action && (
                  <button
                    type="button"
                    onClick={() => {
                      toast.action?.onClick()
                      dismiss(toast.id)
                    }}
                    className="text-primary focus-visible:ring-ring font-black tracking-wide uppercase hover:underline focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {toast.action.label}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss"
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </ToastContext.Provider>
  )
}
