import React, { useCallback, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { X } from 'lucide-react'

const sizeClasses: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  '2xl': 'max-w-4xl',
  '3xl': 'max-w-5xl',
}

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: React.ReactNode
  children?: React.ReactNode
  size?: string
  footer?: React.ReactNode
  hideCloseButton?: boolean
}

// Copied from TREK's shared Modal. Keep changes here aligned with the host
// component because plugin frames cannot import host client modules.
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer,
  hideCloseButton = false,
}: ModalProps) {
  const handleEsc = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleEsc])

  const mouseDownTarget = useRef<EventTarget | null>(null)

  if (!isOpen) return null

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center bg-[rgba(15,23,42,0.5)] px-4 trek-modal-backdrop trek-backdrop-enter dark:bg-[rgba(0,0,0,0.6)] sm:items-center"
      style={{ paddingTop: 70, paddingBottom: 'calc(20px + var(--bottom-nav-h))', overflow: 'hidden' }}
      onMouseDown={(event) => {
        mouseDownTarget.current = event.target
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && mouseDownTarget.current === event.currentTarget) onClose()
        mouseDownTarget.current = null
      }}
    >
      <div
        className={`trek-modal-enter flex max-h-[calc(100dvh-var(--bottom-nav-h)-90px)] w-full flex-col overflow-hidden rounded-2xl bg-surface-card shadow-2xl sm:max-h-[calc(100dvh-90px)] ${sizeClasses[size] || sizeClasses.md}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-edge-secondary p-6">
          <h2 className="text-lg font-semibold text-content">{title}</h2>
          {!hideCloseButton && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>

        {footer && <div className="shrink-0 border-t border-edge-secondary p-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
