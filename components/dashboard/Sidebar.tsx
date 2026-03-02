'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Handshake, BarChart3, Webhook, Key, BookOpen, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [userEmail, setUserEmail] = useState<string | null>(null)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserEmail(data.user?.email || null)
        })
    }, [supabase.auth])

    const handleSignout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    // Handle auto-collapse on tablet
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768 && window.innerWidth <= 1024) {
                setIsCollapsed(true)
            } else if (window.innerWidth > 1024) {
                setIsCollapsed(false)
            }
        }
        window.addEventListener('resize', handleResize)
        handleResize() // check initially
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const navItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Deals', href: '/dashboard/deals', icon: Handshake },
        { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
        { name: 'Webhooks', href: '/dashboard/webhooks', icon: Webhook },
        { name: 'API Keys', href: '/dashboard/keys', icon: Key },
    ]

    return (
        <>
            {/* Desktop Sidebar */}
            <nav
                className={`hidden md:flex flex-col bg-surface border-r border-border-dim transition-all duration-300 relative z-20 ${isCollapsed ? 'w[68px] min-w-[68px]' : 'w-[220px] min-w-[220px]'
                    }`}
            >
                <div className={`p-4 flex items-center h-16 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => router.push('/dashboard')}>
                        <div className="w-5 h-5 flex-shrink-0 border border-electric rounded-sm skew-x-[-12deg] group-hover:bg-electric/20 transition-colors" />
                        {!isCollapsed && <span className="font-display font-bold tracking-[0.12em] text-text-primary mt-0.5">DEALFLOW</span>}
                    </div>

                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={`hidden lg:flex items-center justify-center w-6 h-6 rounded-md hover:bg-overlay text-text-muted hover:text-text-primary transition-colors ${isCollapsed ? 'absolute -right-3 top-5 bg-elevated border border-border-default shadow-sm z-50' : ''}`}
                    >
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4 ml-2" />}
                    </button>
                </div>

                <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center h-9 px-3 rounded-md transition-all duration-150 group relative ${isActive
                                        ? 'bg-electric-dim text-electric shadow-[inset_2px_0_0_0_var(--electric)] bg-overlay/50'
                                        : 'text-text-secondary hover:bg-overlay hover:text-text-primary'
                                    } ${isCollapsed ? 'justify-center' : ''}`}
                                title={isCollapsed ? item.name : undefined}
                            >
                                <item.icon className="w-4 h-4 flex-shrink-0" />
                                {!isCollapsed && <span className="ml-3 text-sm font-medium">{item.name}</span>}
                            </Link>
                        )
                    })}
                </div>

                <div className="px-3 pb-4">
                    <div className="pt-4 border-t border-border-dim mb-2 space-y-1">
                        <a
                            href="https://docs.dealflow.dev"
                            target="_blank"
                            rel="noreferrer"
                            className={`flex items-center h-8 px-3 rounded-md text-text-muted hover:text-text-primary transition-colors text-xs ${isCollapsed ? 'justify-center' : ''}`}
                            title={isCollapsed ? "Documentation" : undefined}
                        >
                            <BookOpen className="w-[14px] h-[14px]" />
                            {!isCollapsed && <span className="ml-2">Documentation ↗</span>}
                        </a>
                    </div>

                    {/* User Section */}
                    <div className={`mt-2 flex items-center rounded-lg p-2 group transition-colors hover:bg-overlay cursor-pointer relative ${isCollapsed ? 'justify-center' : ''}`}>
                        <div className="w-8 h-8 rounded-full bg-elevated border border-border-default flex items-center justify-center text-electric text-xs font-bold shrink-0">
                            {userEmail ? userEmail.charAt(0).toUpperCase() : '?'}
                        </div>

                        {!isCollapsed && (
                            <div className="ml-3 overflow-hidden flex-1">
                                <div className="text-xs text-text-muted truncate group-hover:text-text-secondary transition-colors">
                                    {userEmail || 'Loading...'}
                                </div>
                            </div>
                        )}

                        {/* Logout appears on hover */}
                        <button
                            onClick={(e) => { e.stopPropagation(); handleSignout(); }}
                            className={`text-text-muted hover:text-danger p-1 rounded transition-colors ${isCollapsed ? 'hidden' : 'opacity-0 group-hover:opacity-100 absolute right-2 bg-overlay'
                                }`}
                            title="Sign out"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border-dim z-50 px-2 flex items-center justify-around pb-safe">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-colors ${isActive ? 'text-electric' : 'text-text-secondary hover:text-text-primary'
                                }`}
                        >
                            <item.icon className="w-5 h-5 mb-1" />
                            {isActive && <div className="w-1 h-1 rounded-full bg-electric absolute bottom-1 shadow-[0_0_8px_var(--electric)]" />}
                        </Link>
                    )
                })}
            </nav>
        </>
    )
}
