import React from 'react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-bg-void flex flex-col items-center justify-center p-4">
            {/* Background terminal grid (subtle) */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.15]"
                style={{
                    backgroundImage: 'linear-gradient(to right, rgb(var(--border-dim)) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--border-dim)) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />

            {/* Decorative center glow */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-electric/5 blur-[100px] rounded-full pointer-events-none" />

            {/* Box */}
            <div className="relative w-full max-w-[420px] bg-surface border border-border-default shadow-2xl rounded-2xl p-8 z-10">
                <div className="flex justify-center items-center gap-2 mb-8">
                    <div className="w-5 h-5 border border-electric rounded-sm skew-x-[-12deg]" />
                    <span className="font-display font-bold tracking-[0.12em] text-text-primary">DEALFLOW</span>
                </div>
                {children}
            </div>
        </div>
    )
}
