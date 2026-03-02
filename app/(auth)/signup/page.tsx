'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { Loader2, CheckCircle2 } from 'lucide-react'

export default function SignupPage() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password.length < 8) {
            setError('Password must be at least 8 characters')
            return
        }

        setIsLoading(true)
        setError(null)

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                },
            }
        })

        if (error) {
            setError(error.message)
            setIsLoading(false)
        } else {
            setIsSuccess(true)
            setIsLoading(false)
        }
    }

    if (isSuccess) {
        return (
            <div className="animate-fade-up text-center py-6">
                <div className="w-12 h-12 rounded-full bg-electric/20 text-electric flex items-center justify-center mx-auto mb-4 border border-electric/40">
                    <CheckCircle2 className="w-6 h-6" />
                </div>
                <h2 className="font-display text-2xl text-text-primary mb-3">Check your email</h2>
                <p className="text-text-secondary mb-8">
                    We've sent a welcome link to<br />
                    <span className="font-mono text-text-primary">{email}</span>
                </p>
                <Link href="/login" className="text-sm border border-border-default px-6 py-2 rounded-md hover:bg-elevated transition-colors text-text-primary">
                    Return to login
                </Link>
            </div>
        )
    }

    return (
        <div className="animate-fade-up">
            <h1 className="font-display text-2xl text-text-primary text-center mb-6">Create your account</h1>

            <form onSubmit={handleSignup} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1" htmlFor="name">Name (Optional)</label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-elevated border border-border-dim rounded-md px-3 py-2 text-text-primary focus:outline-none focus:border-border-bright focus:ring-1 focus:ring-electric transition-colors"
                    />
                </div>

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
                        minLength={8}
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-electric text-black font-bold font-display tracking-wide py-2.5 rounded-md hover:bg-white hover:scale-[0.98] transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create account'}
                </button>

                {error && (
                    <div className="text-danger text-sm text-center py-2 px-3 bg-danger-dim border border-danger/30 rounded-md animate-shake">
                        {error}
                    </div>
                )}
            </form>

            <div className="mt-8 text-center">
                <p className="text-sm text-text-secondary">
                    Already have an account?{' '}
                    <Link href="/login" className="text-electric hover:underline underline-offset-4">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    )
}
