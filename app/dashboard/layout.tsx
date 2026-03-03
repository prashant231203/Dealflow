'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/dashboard/Topbar'
import { CommandPalette } from '@/components/command/CommandPalette'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isOffline, setIsOffline] = useState(false)
    const [justReconnected, setJustReconnected] = useState(false)
    const [isCommandOpen, setIsCommandOpen] = useState(false)

    useEffect(() => {
        function handleOnline() {
            setIsOffline(false)
            setJustReconnected(true)

            // Auto-refresh the page when reconnected
            setTimeout(() => {
                window.location.reload()
            }, 500)

            setTimeout(() => {
                setJustReconnected(false)
            }, 3000)
        }

        function handleOffline() {
            setIsOffline(true)
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        // Check initial state
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setIsOffline(true)
        }

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    return (
        <div className="flex h-screen overflow-hidden bg-bg-void selection:bg-electric/20 text-text-primary">
            {/* Network banners */}
            {isOffline && (
                <div className="fixed top-0 left-0 w-full z-[100] bg-warning text-black text-sm font-medium py-1 text-center animate-fade-up border-b border-warning-dim">
                    <span className="w-2 h-2 rounded-full bg-black/50 inline-block mr-2 animate-pulse" />
                    No internet connection — reconnecting...
                </div>
            )}
            {justReconnected && !isOffline && (
                <div className="fixed top-0 left-0 w-full z-[100] bg-positive text-black text-sm font-medium py-1 text-center animate-fade-up border-b border-positive-dim">
                    <span className="w-2 h-2 rounded-full bg-black/50 inline-block mr-2" />
                    Reconnected — refreshing data...
                </div>
            )}

            <CommandPalette isOpen={isCommandOpen} onOpenChange={setIsCommandOpen} />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-[1]">
                <Topbar onOpenCommandPalette={() => setIsCommandOpen(true)} />

                <main className="flex-1 overflow-auto p-4 md:p-6 relative">
                    {children}
                </main>
            </div>
        </div>
    )
}
