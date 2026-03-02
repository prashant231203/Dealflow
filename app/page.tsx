import Link from 'next/link'
import { ArrowRight, Box, Cpu, ShieldCheck } from 'lucide-react'

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-bg-void overflow-hidden selection:bg-electric/20 text-text-primary">
            {/* Background terminal grid */}
            <div className="fixed inset-0 pointer-events-none opacity-20"
                style={{
                    backgroundImage: 'linear-gradient(to right, rgb(var(--border-dim)) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--border-dim)) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 border-2 border-electric rounded-sm skew-x-[-12deg]" />
                    <span className="font-display font-bold tracking-[0.12em] text-lg">DEALFLOW</span>
                </div>
                <nav className="flex items-center gap-6">
                    <Link href="/login" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Sign In</Link>
                    <Link href="/signup" className="text-sm font-medium bg-white text-black px-4 py-2 rounded-md hover:bg-gray-200 transition-colors">Get API Key</Link>
                </nav>
            </header>

            <main className="relative z-10 pt-24 pb-32">
                {/* Above the fold */}
                <section className="max-w-7xl mx-auto px-8 min-h-[75vh] flex items-center">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">

                        {/* Left Content */}
                        <div className="animate-fade-up">
                            <span className="inline-block font-display text-[10px] uppercase tracking-[0.2em] text-electric mb-6 border border-electric/30 bg-electric/5 px-3 py-1 rounded-full">
                                AGENTIC COMMERCE INFRASTRUCTURE
                            </span>
                            <h1 className="text-6xl md:text-7xl font-display leading-[1.1] tracking-tight mb-6">
                                Your commerce agent<br />
                                <span className="italic text-electric">forgets nothing.</span>
                            </h1>
                            <p className="text-xl text-text-secondary max-w-lg mb-10 leading-relaxed">
                                The SDK that gives AI commerce agents persistent, intelligent deal state. Three methods. Zero complexity.
                            </p>
                            <div className="flex flex-wrap items-center gap-4">
                                <Link href="/signup" className="bg-electric text-bg-void font-display font-bold px-8 py-4 rounded-lg hover:bg-white hover:scale-[0.98] transition-all duration-200">
                                    Get API Key
                                </Link>
                                <Link href="#" className="flex items-center gap-2 text-electric border border-electric/30 px-8 py-4 rounded-lg hover:bg-electric/10 transition-colors">
                                    Read the docs <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>

                        {/* Right Terminals */}
                        <div className="relative animate-fade-up" style={{ animationDelay: '100ms' }}>
                            <div className="absolute -inset-1 bg-electric/20 blur-2xl rounded-3xl" />
                            <div className="relative bg-[#0A0A0F] border border-border-bright rounded-xl shadow-2xl overflow-hidden font-mono text-sm leading-relaxed">
                                <div className="flex items-center gap-2 px-4 py-3 border-b border-border-dim bg-bg-surface">
                                    <div className="w-3 h-3 rounded-full bg-danger" />
                                    <div className="w-3 h-3 rounded-full bg-warning" />
                                    <div className="w-3 h-3 rounded-full bg-positive" />
                                </div>
                                <div className="p-6 text-text-secondary">
                                    <div className="mb-4">
                                        <span className="text-[#B44DFF]">const</span> deal = <span className="text-[#4D9FFF]">await</span> <span className="text-white">Deal.create</span>({'{'}
                                        <br />  intent: <span className="text-[#FFB347]">'buy 200 gpus'</span>
                                        <br />{'}'});
                                    </div>

                                    <div className="mb-4 opacity-50 italic">
                                        <span className="text-text-muted">// Agent pod crashes, memory lost</span><br />
                                        <span className="text-danger">Killed: 9</span>
                                    </div>

                                    <div className="">
                                        <span className="text-text-muted">// Different pod picks it up</span><br />
                                        <span className="text-[#B44DFF]">const</span> deal = <span className="text-[#4D9FFF]">await</span> <span className="text-white">Deal.resume</span>(deal.id);
                                        <br /><br />
                                        console.<span className="text-[#4D9FFF]">log</span>(deal.current_summary);<br />
                                        <span className="text-electric">{'// "Negotiation in progress. Last offer: $4k"'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* The Problem / Solution Timeline */}
                <section className="max-w-7xl mx-auto px-8 py-32 border-t border-border-dim">
                    <div className="grid md:grid-cols-2 gap-16">
                        <div className="opacity-60 grayscale">
                            <h3 className="font-display text-2xl mb-8 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-border-bright flex items-center justify-center text-sm">✕</span>
                                Before Dealflow
                            </h3>
                            <div className="space-y-6 relative border-l border-border-dim ml-4 pl-8 py-2">
                                <div className="relative">
                                    <div className="absolute w-3 h-3 bg-border-bright rounded-full -left-[38px] top-1.5" />
                                    <p className="text-text-primary font-medium">Agent starts negotiation</p>
                                </div>
                                <div className="relative">
                                    <div className="absolute w-3 h-3 bg-border-bright rounded-full -left-[38px] top-1.5" />
                                    <p className="text-text-primary font-medium">Makes $400 offer</p>
                                </div>
                                <div className="relative">
                                    <div className="absolute w-3 h-3 bg-danger rounded-full -left-[38px] top-1.5 shadow-[0_0_12px_rgba(255,77,109,0.5)]" />
                                    <p className="text-danger font-medium">Process OOM crashes</p>
                                    <p className="text-sm text-text-muted mt-1 italic">Context window lost. Start over.</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-display text-2xl mb-8 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-electric/20 text-electric flex items-center justify-center text-sm">✓</span>
                                With Dealflow
                            </h3>
                            <div className="space-y-6 relative border-l border-electric/30 ml-4 pl-8 py-2">
                                <div className="relative">
                                    <div className="absolute w-3 h-3 bg-electric rounded-full -left-[38px] top-1.5 shadow-[0_0_12px_rgba(77,255,180,0.4)]" />
                                    <p className="text-text-primary font-medium">Agent starts negotiation <span className="text-text-muted font-mono text-sm ml-2">Deal.create()</span></p>
                                </div>
                                <div className="relative">
                                    <div className="absolute w-3 h-3 bg-electric rounded-full -left-[38px] top-1.5 shadow-[0_0_12px_rgba(77,255,180,0.4)]" />
                                    <p className="text-text-primary font-medium">Makes $400 offer <span className="text-text-muted font-mono text-sm ml-2">deal.act()</span></p>
                                </div>
                                <div className="relative">
                                    <div className="absolute w-3 h-3 bg-warning rounded-full -left-[38px] top-1.5" />
                                    <p className="text-warning font-medium">Process crashes</p>
                                </div>
                                <div className="relative">
                                    <div className="absolute w-3 h-3 bg-electric rounded-full -left-[38px] top-1.5 shadow-[0_0_12px_rgba(77,255,180,0.4)]" />
                                    <p className="text-text-primary font-medium">New pod resumes deal <span className="text-text-muted font-mono text-sm ml-2">Deal.resume()</span></p>
                                    <p className="text-sm text-electric mt-1 italic">Picks up exactly where it left off.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Three Features */}
                <section className="max-w-7xl mx-auto px-8 py-32">
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-surface border border-border-default rounded-2xl p-8 hover:border-border-bright transition-colors">
                            <Box className="w-8 h-8 text-electric mb-6" />
                            <h3 className="font-display text-xl mb-3">Persistent State</h3>
                            <p className="text-text-secondary leading-relaxed">Deals live outside your agent's memory limits. Crash resilient, distributed, and completely permanent.</p>
                        </div>
                        <div className="bg-surface border border-border-default rounded-2xl p-8 hover:border-border-bright transition-colors">
                            <Cpu className="w-8 h-8 text-electric mb-6" />
                            <h3 className="font-display text-xl mb-3">Commerce Intelligence</h3>
                            <p className="text-text-secondary leading-relaxed">Every action triggers a Groq-powered semantic summary, briefing any agent instantly upon resumption.</p>
                        </div>
                        <div className="bg-surface border border-border-default rounded-2xl p-8 hover:border-border-bright transition-colors">
                            <ShieldCheck className="w-8 h-8 text-electric mb-6" />
                            <h3 className="font-display text-xl mb-3">Full Audit Trail</h3>
                            <p className="text-text-secondary leading-relaxed">Cryptographic HMAC webhooks and unbreakable timelines mean you always know exactly what your agents did.</p>
                        </div>
                    </div>
                </section>

                {/* Pricing */}
                <section className="max-w-5xl mx-auto px-8 py-32">
                    <h2 className="text-center font-display text-4xl mb-16">Straightforward Pricing</h2>
                    <div className="grid md:grid-cols-3 gap-8 items-center">
                        <div className="bg-surface border border-border-default rounded-2xl p-8">
                            <h3 className="font-display text-lg mb-2">Hobby</h3>
                            <div className="text-3xl font-mono mb-6">$0<span className="text-base text-text-muted">/mo</span></div>
                            <ul className="space-y-4 text-sm text-text-secondary mb-8">
                                <li>1,000 active deals</li>
                                <li>30 day history retention</li>
                                <li>Community support</li>
                            </ul>
                            <Link href="/signup" className="block text-center w-full py-2 border border-border-bright rounded transition-colors hover:bg-overlay">Get Started</Link>
                        </div>

                        <div className="bg-elevated border border-electric/50 shadow-[0_0_30px_rgba(77,255,180,0.1)] transform scale-105 rounded-2xl p-10 relative">
                            <div className="absolute top-0 right-8 -translate-y-1/2 bg-electric text-black font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wide">
                                Most Popular
                            </div>
                            <h3 className="font-display text-xl text-electric mb-2">Builder</h3>
                            <div className="text-4xl font-mono mb-6">$49<span className="text-base text-text-muted">/mo</span></div>
                            <ul className="space-y-4 text-sm text-text-primary mb-8">
                                <li>100,000 active deals</li>
                                <li>Unlimited history</li>
                                <li>HMAC Webhooks</li>
                                <li>Priority email support</li>
                            </ul>
                            <Link href="/signup" className="block text-center w-full py-3 bg-electric text-black font-bold rounded hover:bg-white transition-colors">Get Started</Link>
                        </div>

                        <div className="bg-surface border border-border-default rounded-2xl p-8">
                            <h3 className="font-display text-lg mb-2">Enterprise</h3>
                            <div className="text-3xl font-mono mb-6">Custom</div>
                            <ul className="space-y-4 text-sm text-text-secondary mb-8">
                                <li>Unlimited active deals</li>
                                <li>Custom SLA</li>
                                <li>Dedicated slack channel</li>
                            </ul>
                            <Link href="/signup" className="block text-center w-full py-2 border border-border-bright rounded transition-colors hover:bg-overlay">Contact Us</Link>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-border-dim py-12">
                <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-text-muted">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border border-text-muted rounded-sm skew-x-[-12deg]" />
                        <span className="font-display tracking-wider">DEALFLOW</span>
                    </div>
                    <div className="flex gap-6">
                        <Link href="#" className="hover:text-text-primary transition-colors">Docs</Link>
                        <Link href="#" className="hover:text-text-primary transition-colors">API</Link>
                        <Link href="#" className="hover:text-text-primary transition-colors">Status</Link>
                        <Link href="#" className="hover:text-text-primary transition-colors">Terms</Link>
                    </div>
                    <div>© 2026 Dealflow Inc.</div>
                </div>
            </footer>
        </div>
    )
}
