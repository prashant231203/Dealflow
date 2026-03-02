'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CopyButtonProps {
    value: string
    size?: 'sm' | 'md'
    className?: string
}

export function CopyButton({ value, size = 'sm', className }: CopyButtonProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!value) return

        try {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy', err)
        }
    }

    const dims = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8'
    const iconDims = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'

    return (
        <button
            onClick={handleCopy}
            className={cn(
                "flex items-center justify-center rounded-md border border-border-dim bg-overlay hover:bg-elevated text-text-muted hover:text-text-primary transition-colors focus-visible:outline-electric",
                dims,
                copied && "text-positive hover:text-positive border-positive/30 bg-positive/10",
                className
            )}
            aria-label="Copy to clipboard"
            title="Copy to clipboard"
        >
            {copied ? (
                <Check className={iconDims} />
            ) : (
                <Copy className={iconDims} />
            )}
        </button>
    )
}
