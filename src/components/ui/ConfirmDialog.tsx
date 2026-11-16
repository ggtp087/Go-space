import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description?: string
  /** Extra content between the description and the buttons — e.g. a review list. */
  children?: ReactNode
  confirmLabel: string
  /** Shown on the confirm button while onConfirm is running. */
  busyLabel: string
  cancelLabel: string
  /** Runs the action. The dialog stays open (confirm button in its busy state) until it settles; the caller closes it on success. */
  onConfirm: () => Promise<void>
  /** Closes without doing anything — Cancel, Esc, or a click on the backdrop. */
  onCancel: () => void
  /** Where focus goes when the dialog closes — the button that opened it. Defaults to whatever had focus when it opened. */
  returnFocusRef?: RefObject<HTMLElement | null>
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * The app's one confirmation dialog. Accessible modal behavior:
 * - role="dialog" + aria-modal, labelled by its title (and described by its description)
 * - focus moves into the dialog on open and is trapped there (the rest of the
 *   app is made inert); it returns to the triggering button on close
 * - Esc, Cancel, or the backdrop close it without confirming; Enter never
 *   confirms by itself (initial focus is on the dialog, not the confirm button)
 * - the confirm button shows a busy label and ignores repeat clicks (and
 *   Cancel/Esc are ignored) while onConfirm is running
 */
export function ConfirmDialog(props: ConfirmDialogProps) {
  if (!props.open) return null
  return createPortal(<ConfirmDialogContent {...props} />, document.body)
}

function ConfirmDialogContent({ title, description, children, confirmLabel, busyLabel, cancelLabel, onConfirm, onCancel, returnFocusRef }: ConfirmDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  // A ref, not just state: a second click in the same frame would still see
  // the stale `busy === false` from the render it was dispatched in.
  const busyRef = useRef(false)

  // Mount: remember where focus came from, make the app behind inert, move
  // focus into the dialog. Unmount: undo both and return focus.
  useEffect(() => {
    const returnTarget = returnFocusRef?.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    const appRoot = document.getElementById('root')
    appRoot?.setAttribute('inert', '')
    dialogRef.current?.focus()
    return () => {
      appRoot?.removeAttribute('inert')
      if (returnTarget?.isConnected) returnTarget.focus()
    }
    // Runs once per opening — returnFocusRef is a stable ref object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleConfirm() {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  function handleCancel() {
    if (busyRef.current) return
    onCancel()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      handleCancel()
      return
    }
    // Enter only ever activates a focused button — never confirms on its own.
    if (event.key === 'Enter' && !(event.target instanceof HTMLButtonElement)) {
      event.preventDefault()
      return
    }
    if (event.key === 'Tab') {
      const focusables = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
      if (focusables.length === 0) {
        event.preventDefault()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || active === dialogRef.current)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-[rgba(15,46,34,0.45)] p-4" onMouseDown={(event) => event.target === event.currentTarget && handleCancel()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="w-full max-w-[460px] rounded-[14px] bg-white p-6 shadow-card-lg outline-none"
      >
        <h2 id={titleId} className="text-[17px] font-bold leading-snug text-ink">
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className="mt-1.5 text-[13px] leading-relaxed text-slate">
            {description}
          </p>
        )}
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-6 flex justify-end gap-2.5">
          {/* aria-disabled rather than disabled while busy: disabling the
              focused button would drop focus out of the dialog. The busyRef
              guard is what actually blocks a second action. */}
          <Button type="button" variant="secondary" onClick={handleCancel} aria-disabled={busy}>
            {cancelLabel}
          </Button>
          <Button type="button" variant="primary" onClick={handleConfirm} aria-disabled={busy} aria-busy={busy}>
            {busy && <Spinner />}
            {busy ? busyLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden="true">
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  )
}
