'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError(error.message)
            setIsLoading(false)
        } else {
            router.push('/dashboard')
            router.refresh()
        }
    }

    return (
        <div className="animate-fade-up">
            <h1 className="font-display text-2xl text-text-primary text-center mb-6">Welcome back</h1>

            <form onSubmit={handleLogin} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1" htmlFor="email">Email</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-elevated border border-border-dim rounded-md px-3 py-2 text-text-primary focus:outline-none focus:border-border-bright focus:ring-1 focus:ring-electric transition-colors"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1" htmlFor="password">Password</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-elevated border border-border-dim rounded-md px-3 py-2 text-text-primary focus:outline-none focus:border-border-bright focus:ring-1 focus:ring-electric transition-colors font-mono"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-electric text-black font-bold font-display tracking-wide py-2.5 rounded-md hover:bg-white hover:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 mt-4"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign in'}
                </button>

                {error && (
                    <div className="text-danger text-sm text-center py-2 px-3 bg-danger-dim border border-danger/30 rounded-md animate-shake">
                        {error}
                    </div>
                )}
            </form>

            <div className="mt-8 text-center">
                <p className="text-sm text-text-secondary">
                    Don't have an account?{' '}
                    <Link href="/signup" className="text-electric hover:underline underline-offset-4">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    )
}
