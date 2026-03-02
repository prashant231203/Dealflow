import type { Metadata } from 'next'
import { Syne, DM_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/shared/ToastProvider'

const syne = Syne({
    subsets: ['latin'],
    variable: '--font-syne',
    display: 'swap',
})

const dmSans = DM_Sans({
    subsets: ['latin'],
    variable: '--font-dm-sans',
    display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-berkeley-mono', // alias mapping
    display: 'swap',
})

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
        <html lang="en" className={`${syne.variable} ${dmSans.variable} ${jetbrainsMono.variable} dark`}>
            <body className="font-sans antialiased">
                <ToastProvider>
                    {children}
                </ToastProvider>
            </body>
        </html>
    )
}
