'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function ShortcutsModal() {
    const [isOpen, setIsOpen] = useState(false)
    const [pressedG, setPressedG] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if user is typing in an input/textarea
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                return
            }

            if (e.key === '?') {
                setIsOpen((prev) => !prev)
                return
            }

            if (e.key === 'Escape') {
                setIsOpen(false)
                return
            }

            if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey) {
                // Only refresh if not in a modal typing etc
                router.refresh()
                return
            }

            if (e.key.toLowerCase() === 'g') {
                setPressedG(true)
                // Reset the 'g' press after 1 second if no follow up
                setTimeout(() => setPressedG(false), 1000)
                return
            }

            if (pressedG) {
                switch (e.key.toLowerCase()) {
                    case 'd':
                        router.push('/dashboard')
                        break
                    case 'l':
                        router.push('/dashboard/deals')
                        break
                    case 'a':
                        router.push('/dashboard/analytics')
                        break
                    case 'w':
                        router.push('/dashboard/webhooks')
                        break
                    case 'k':
                        router.push('/dashboard/keys')
                        break
                }
                setPressedG(false)
                setIsOpen(false)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [pressedG, router])

    if (!isOpen) return null

    const shortcuts = [
        { keys: ['G', 'D'], desc: 'Go to Dashboard' },
        { keys: ['G', 'L'], desc: 'Go to Deals list' },
        { keys: ['G', 'A'], desc: 'Go to Analytics' },
        { keys: ['G', 'W'], desc: 'Go to Webhooks' },
        { keys: ['G', 'K'], desc: 'Go to API Keys' },
        { keys: ['R'], desc: 'Refresh current data' },
        { keys: ['C'], desc: 'Copy Deal ID (when hovering)' },
        { keys: ['Esc'], desc: 'Close any modal' },
    ]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-bg-void/80 backdrop-blur-sm transition-opacity"
                onClick={() => setIsOpen(false)}
            />
            <div className="relative bg-elevated border border-border-bright rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-up">
                <div className="p-5 border-b border-border-dim flex justify-between items-center">
                    <h2 className="font-display font-bold text-text-primary">Keyboard Shortcuts</h2>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-text-muted hover:text-text-primary transition-colors focus-visible:outline-electric rounded-sm"
                    >
                        <span className="sr-only">Close mode</span>
                        ✕
                    </button>
                </div>
                <div className="p-2">
                    {shortcuts.map((s, i) => (
                        <div key={i} className="flex justify-between items-center p-3 hover:bg-overlay rounded-lg transition-colors group">
                            <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">{s.desc}</span>
                            <div className="flex gap-1.5">
                                {s.keys.map(k => (
                                    <kbd key={k} className="bg-surface border border-border-default rounded px-2 py-1 text-xs font-mono text-text-primary shadow-sm">
                                        {k}
                                    </kbd>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
