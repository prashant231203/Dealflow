import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/shared/ToastProvider'

export const metadata: Metadata = {
    title: 'Dealflow',
    description: 'Commerce intelligence for AI agents',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html
            lang="en"
            className="dark"
            style={{
                ['--font-syne' as any]: 'Geist, Segoe UI, Helvetica Neue, Arial, sans-serif',
                ['--font-dm-sans' as any]: 'Geist, Segoe UI, Helvetica Neue, Arial, sans-serif',
                ['--font-berkeley-mono' as any]: 'Geist Mono, JetBrains Mono, Fira Code, Consolas, monospace',
            }}
        >
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body className="font-sans antialiased">
                <ToastProvider>
                    {children}
                </ToastProvider>
            </body>
        </html>
    )
}
