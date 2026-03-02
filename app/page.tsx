import Link from 'next/link'
import { ArrowRight, Box, Cpu, ShieldCheck } from 'lucide-react'

const stats = [
    { label: 'Crash-proof deals', value: '24/7', helper: 'Multi-agent continuity' },
    { label: 'Performance boost', value: '+38%', helper: 'Faster negotiations' },
    { label: 'Webhooks delivered', value: '98%', helper: 'Signed, reliable streams' },
]

const highlights = [
    {
        title: 'Persistent state',
        body: 'Deals live outside the agent process and resume reliably when nodes crash.',
        icon: Box,
    },
    {
        title: 'Intelligence baked in',
        body: 'Every action emits a Groq-powered summary so the next pod picks up context instantly.',
        icon: Cpu,
    },
    {
        title: 'Secure automation',
        body: 'API keys rotate automatically, webhooks ship signed payloads, and you stay audit-ready.',
        icon: ShieldCheck,
    },
]

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#05070C] via-[#030409] to-[#05070C] text-text-primary selection:bg-electric/30">
            <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(77,255,180,0.18),_transparent_45%)]" />
            <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_bottom,_rgba(77,159,255,0.1),_transparent_55%)]" />

            <header className="relative z-10 border-b border-border-dim bg-bg-void/80 backdrop-blur-sm">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
                    <div className="flex items-center gap-3 text-sm font-semibold tracking-[0.3em] uppercase">
                        <div className="h-6 w-6 rounded-lg border border-electric/50 bg-electric/10" />
                        DEALFLOW
                    </div>
                    <nav className="flex items-center gap-6 text-sm text-text-secondary">
                        <Link href="/login" className="hover:text-text-primary transition-colors">Sign In</Link>
                        <Link
                            href="/signup"
                            className="rounded-full bg-electric px-5 py-2 text-xs font-semibold text-black transition-colors hover:bg-white"
                        >
                            Get API Key
                        </Link>
                    </nav>
                </div>
            </header>

            <main className="relative z-10">
                <section className="mx-auto max-w-6xl px-6 py-20 lg:py-24">
                    <div className="grid gap-12 rounded-3xl border border-border-default bg-surface/70 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)] lg:grid-cols-[1.1fr_0.9fr]">
                        <div className="space-y-6">
                            <span className="inline-flex items-center gap-2 rounded-full border border-electric/50 bg-electric/10 px-4 py-1 text-[11px] uppercase tracking-[0.3em] text-electric">
                                Agentic Commerce Infrastructure
                            </span>
                            <h1 className="text-4xl font-display leading-tight text-text-primary sm:text-5xl">
                                Always-on, crash-resistant commerce agents.
                                <span className="text-electric"> Never miss a bid.</span>
                            </h1>
                            <p className="max-w-2xl text-lg text-text-secondary">
                                Dealflow stores every intent, action, and negotiation outcome outside the agent runtime so any pod can continue without context loss, while the SDK and UI keep your API keys, webhooks, and audit trails tightly controlled.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <Link
                                    href="/signup"
                                    className="inline-flex items-center justify-center rounded-full bg-electric px-6 py-3 text-sm font-bold text-black transition-all hover:bg-white"
                                >
                                    Create API Key
                                </Link>
                                <Link
                                    href="#features"
                                    className="inline-flex items-center gap-2 rounded-full border border-electric/50 px-6 py-3 text-sm font-semibold text-electric"
                                >
                                    See how it works <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-electric/20 to-transparent blur-3xl" />
                            <div className="relative rounded-2xl border border-border-bright bg-[#0B0F16] p-6 text-sm font-mono leading-relaxed">
                                <div className="mb-4 flex justify-between text-xs uppercase tracking-[0.4em] text-text-muted">
                                    <span>session</span>
                                    <span>live</span>
                                </div>
                                <p className="text-text-primary">
                                    <span className="text-[#B44DFF]">const</span>{' '}
                                    <span className="text-[#4D9FFF]">deal</span>{' '}
                                    = await Deal.resilient(<span className="text-[#FFB347]">intent</span>);
                                </p>
                                <p className="mt-3 text-text-muted italic">// Agent pods crash. Dealflow resumes instantly.</p>
                                <div className="mt-6 rounded-2xl border border-border-dim bg-surface/60 p-4 text-xs text-text-secondary">
                                    <p>HMAC webhooks • Realtime summaries • API key rotation</p>
                                    <p className="mt-2 text-[10px] uppercase tracking-[0.5em] text-electric">always recorded</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mx-auto max-w-6xl px-6 py-12">
                    <div className="grid gap-6 md:grid-cols-3">
                        {stats.map(stat => (
                            <div key={stat.label} className="rounded-2xl border border-border-default bg-bg-surface/60 p-6 text-center">
                                <p className="text-sm uppercase tracking-[0.3em] text-text-muted">{stat.label}</p>
                                <p className="mt-2 text-3xl font-display text-electric">{stat.value}</p>
                                <p className="text-xs text-text-secondary">{stat.helper}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section id="features" className="mx-auto max-w-6xl px-6 py-16">
                    <div className="grid gap-8 md:grid-cols-3">
                        {highlights.map((item) => (
                            <div key={item.title} className="rounded-2xl border border-border-default bg-surface/70 p-6 hover:border-electric/50">
                                <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-electric/10">
                                    <item.icon className="h-6 w-6 text-electric" />
                                </div>
                                <h3 className="mt-4 text-xl font-semibold text-text-primary">{item.title}</h3>
                                <p className="mt-2 text-sm text-text-secondary">{item.body}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mx-auto max-w-6xl px-6 py-16">
                    <div className="rounded-3xl border border-electric/30 bg-gradient-to-r from-electric/10 to-transparent p-8 text-center">
                        <p className="text-xs uppercase tracking-[0.4em] text-text-muted">Flowchart</p>
                        <h2 className="mt-3 text-3xl font-display text-text-primary">Dealflow keeps every pod in sync</h2>
                        <p className="mx-auto mt-3 max-w-xl text-sm text-text-secondary">
                            Agents ship intents, Dealflow stores the state, intelligence summaries and webhooks keep stakeholders notified, and new pods pick up right where they left off.
                        </p>
                        <div className="mt-6 flex flex-wrap justify-center gap-3">
                            <span className="rounded-full border border-border-default px-4 py-1 text-xs text-text-muted">Agent → Deal.create()</span>
                            <span className="rounded-full border border-border-default px-4 py-1 text-xs text-text-muted">Dealflow Summary</span>
                            <span className="rounded-full border border-border-default px-4 py-1 text-xs text-text-muted">Webhook / API Keys</span>
                        </div>
                        <div className="mt-6 flex flex-wrap justify-center gap-3">
                            <Link href="/signup" className="rounded-full bg-electric px-6 py-3 text-xs font-bold text-black">
                                Start building
                            </Link>
                            <Link href="#" className="rounded-full border border-text-secondary px-6 py-3 text-xs font-semibold text-text-secondary">
                                Explore docs
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="relative z-10 border-t border-border-dim bg-bg-void/80 p-6 text-xs text-text-muted">
                <div className="mx-auto flex max-w-6xl flex-col gap-3 text-center md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center justify-center gap-2">
                        <div className="h-3 w-3 rounded-full border border-text-muted" />
                        Dealflow Inc.
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <Link href="#" className="hover:text-text-primary">Docs</Link>
                        <Link href="#" className="hover:text-text-primary">API</Link>
                        <Link href="#" className="hover:text-text-primary">Status</Link>
                        <Link href="#" className="hover:text-text-primary">Terms</Link>
                    </div>
                    <div>© 2026 All rights reserved.</div>
                </div>
            </footer>
        </div>
    )
}
