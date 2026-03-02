'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface RelativeTimeProps {
    timestamp: string | Date
    className?: string
}

function getRelativeTimeString(date: Date): string {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`

    return `${Math.floor(diffInSeconds / 31536000)}y ago`
}

export function RelativeTime({ timestamp, className }: RelativeTimeProps) {
    const [timeStr, setTimeStr] = useState<string>('')
    const [dateObj, setDateObj] = useState<Date | null>(null)

    useEffect(() => {
        const d = new Date(timestamp)
        setDateObj(d)
        setTimeStr(getRelativeTimeString(d))

        const intervalId = setInterval(() => {
            setTimeStr(getRelativeTimeString(d))
        }, 60000) // Update every minute

        return () => clearInterval(intervalId)
    }, [timestamp])

    if (!timeStr || !dateObj) {
        return <span className={cn("opacity-0", className)}>just now</span> // avoid layout shift
    }

    return (
        <span
            className={className}
            title={dateObj.toLocaleString()} // Show exact time on hover natively
        >
            {timeStr}
        </span>
    )
}
