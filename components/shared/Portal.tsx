'use client'

import { useEffect, useState, ReactNode } from 'react'
// @ts-ignore
import { createPortal } from 'react-dom'

export function Portal({ children }: { children: ReactNode }) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    return mounted ? createPortal(children, document.body) : null
}
