'use client'

import { useState } from 'react'

interface ConfirmDialogProps {
    isOpen: boolean
    title: string
    description: string
    confirmLabel: string
    dangerous?: boolean
    requiresTyping?: string
    onConfirm: () => void
    onCancel: () => void
}

export function ConfirmDialog({
    isOpen,
    title,
    description,
    confirmLabel,
    dangerous = false,
    requiresTyping,
    onConfirm,
    onCancel
}: ConfirmDialogProps) {
    const [typedValue, setTypedValue] = useState('')

    if (!isOpen) return null

    const isConfirmed = requiresTyping ? typedValue === requiresTyping : true

    const submitStyles = dangerous
        ? "bg-transparent text-danger border border-danger hover:bg-danger hover:text-white"
        : "bg-electric text-black font-bold border border-transparent hover:bg-white"

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-bg-void/80 backdrop-blur-sm transition-opacity"
                onClick={onCancel}
            />

            <div
                className={`relative bg-surface border shadow-2xl w-full max-w-md rounded-xl p-6 animate-fade-up ${dangerous ? 'border-danger/50 shadow-[0_0_40px_rgba(255,77,109,0.1)]' : 'border-border-bright'
                    }`}
                role="dialog"
                aria-modal="true"
            >
                <h2 className={`font-display text-xl font-bold mb-3 ${dangerous ? 'text-danger' : 'text-text-primary'}`}>
                    {title}
                </h2>

                <p className="text-text-secondary text-sm mb-6 leading-relaxed">
                    {description}
                </p>

                {requiresTyping && (
                    <div className="mb-6">
                        <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                            Type <span className="text-text-primary select-none">{requiresTyping}</span> to confirm
                        </label>
                        <input
                            type="text"
                            value={typedValue}
                            onChange={(e) => setTypedValue(e.target.value)}
                            className="w-full bg-elevated border border-border-dim rounded-md px-3 py-2 text-text-primary focus:outline-none focus:border-danger transition-colors font-mono uppercase tracking-widest text-center"
                            placeholder={requiresTyping}
                            autoFocus
                        />
                    </div>
                )}

                <div className="flex items-center justify-end gap-3 mt-8">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-md bg-transparent text-text-secondary border border-border-dim hover:bg-elevated hover:text-text-primary transition-colors focus-visible:outline-electric font-medium"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={onConfirm}
                        disabled={!isConfirmed}
                        className={`px-4 py-2 rounded-md transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed ${submitStyles}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}
