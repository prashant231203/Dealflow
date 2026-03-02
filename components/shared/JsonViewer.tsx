'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { CopyButton } from './CopyButton'
import { cn } from '@/lib/utils'

interface JsonViewerProps {
    data: any
    initiallyOpen?: boolean
    className?: string
}

export function JsonViewer({ data, initiallyOpen = false, className }: JsonViewerProps) {
    const [isOpen, setIsOpen] = useState(initiallyOpen)

    const formattedString = typeof data === 'string'
        ? data
        : JSON.stringify(data, null, 2)

    return (
        <div className={cn("border border-border-dim rounded-lg overflow-hidden bg-surface", className)}>
            <div
                className="flex items-center justify-between p-2 cursor-pointer hover:bg-elevated transition-colors select-none"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2 text-text-secondary">
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <span className="text-xs font-medium">Payload</span>
                </div>
                <div onClick={e => e.stopPropagation()}>
                    <CopyButton value={formattedString} size="sm" className="bg-transparent border-transparent hover:bg-border-dim" />
                </div>
            </div>

            {isOpen && (
                <div className="p-4 border-t border-border-dim bg-[#0a0a0f] overflow-x-auto text-xs font-mono leading-relaxed text-text-data">
                    <pre>
                        <code>
                            {formattedString}
                        </code>
                    </pre>
                </div>
            )}
        </div>
    )
}
