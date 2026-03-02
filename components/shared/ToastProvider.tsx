'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
    id: string
    type: ToastType
    message: string
}

interface ToastContextType {
    toast: (type: ToastType, message: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const addToast = useCallback((type: ToastType, message: string) => {
        const id = Math.random().toString(36).slice(2)
        setToasts((prev) => [...prev, { id, type, message }])

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 4000)
    }, [])

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }

    return (
        <ToastContext.Provider value={{ toast: addToast }}>
            {children}
            <div
                className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none"
                aria-live="polite"
            >
                {toasts.map((t) => (
                    <ToastItem key={t.id} toast={t} onRemove={() => removeToast(t.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    )
}

function ToastItem({ toast, onRemove }: { toast: Toast, onRemove: () => void }) {
    const icons = {
        success: <CheckCircle2 className="w-5 h-5 text-electric" />,
        error: <AlertCircle className="w-5 h-5 text-danger" />,
        warning: <AlertTriangle className="w-5 h-5 text-warning" />,
        info: <Info className="w-5 h-5 text-info" />
    }

    const borderColors = {
        success: 'border-electric',
        error: 'border-danger',
        warning: 'border-warning',
        info: 'border-info'
    }

    const progressColors = {
        success: 'bg-electric',
        error: 'bg-danger',
        warning: 'bg-warning',
        info: 'bg-info'
    }

    // Animation mounting logic
    const [isMounted, setIsMounted] = useState(false)
    useEffect(() => {
        requestAnimationFrame(() => setIsMounted(true))
    }, [])

    return (
        <div
            className={cn(
                "pointer-events-auto flex items-start p-4 bg-elevated border border-border-default rounded-lg shadow-2xl relative overflow-hidden min-w-[300px] max-w-[420px] transition-all duration-300 ease-out translate-y-8 opacity-0",
                isMounted && "translate-y-0 opacity-100",
                `border-l-2 border-l-${toast.type === 'success' ? 'electric' : toast.type}` // tailwind specific override mapped correctly via borderColors but tailwind compilation needs inline classes usually, keeping standard fallback below
            )}
            style={{ borderLeftColor: `var(--${toast.type === 'success' ? 'electric' : toast.type})`, borderLeftWidth: '3px' }}
        >
            <div className="flex-shrink-0 mr-3 mt-0.5">
                {icons[toast.type]}
            </div>
            <div className="flex-1 mr-4">
                <p className="text-sm font-medium text-text-primary mt-[2px]">{toast.message}</p>
            </div>
            <button
                onClick={onRemove}
                className="flex-shrink-0 text-text-muted hover:text-text-primary transition-colors focus-visible:outline-electric"
                aria-label="Dismiss notification"
            >
                <X className="w-4 h-4" />
            </button>

            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 h-0.5 w-full bg-border-dim">
                <div
                    className={cn("h-full animate-[shrink_4s_linear_forwards]", progressColors[toast.type])}
                />
            </div>
        </div>
    )
}

// Add keyframe for shrink programmatically
if (typeof document !== 'undefined') {
    const style = document.createElement('style')
    style.textContent = `
    @keyframes shrink {
      from { width: 100%; }
      to { width: 0%; }
    }
  `
    document.head.appendChild(style)
}

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) throw new Error("useToast must be used within ToastProvider")
    return context
}
