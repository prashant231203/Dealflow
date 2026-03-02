'use client'

import { Search } from 'lucide-react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useRef } from 'react'

export function DealSearchInput() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const timerRef = useRef<NodeJS.Timeout | undefined>(undefined)

    const handleSearch = (value: string) => {
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
            const params = new URLSearchParams(searchParams)
            if (value) {
                params.set('search', value)
            } else {
                params.delete('search')
            }
            params.set('page', '1')
            router.push(`${pathname}?${params.toString()}`)
        }, 400)
    }

    return (
        <div className="relative group">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-electric transition-colors" />
            <input
                type="text"
                placeholder="Search by intent..."
                defaultValue={searchParams.get('search') ?? ''}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-surface border border-border-default rounded-md text-sm text-text-primary w-[240px] focus:outline-none focus:border-electric transition-colors"
            />
        </div>
    )
}
