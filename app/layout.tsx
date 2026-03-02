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
                ['--font-syne' as any]: 'Avenir Next, Segoe UI, Helvetica Neue, Arial, sans-serif',
                ['--font-dm-sans' as any]: 'Inter, Segoe UI, Helvetica Neue, Arial, sans-serif',
                ['--font-berkeley-mono' as any]: 'JetBrains Mono, Fira Code, Consolas, monospace',
            }}
        >
            <body className="font-sans antialiased">
                <ToastProvider>
                    {children}
                </ToastProvider>
            </body>
        </html>
    )
}
