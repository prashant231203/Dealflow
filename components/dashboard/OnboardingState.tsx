import Link from 'next/link'
import { KeyRound, Package, BookOpen } from 'lucide-react'

export function OnboardingState() {
    return (
        <div className="flex flex-col items-center justify-center p-8 max-w-3xl mx-auto my-16 text-center animate-fade-up">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-electric/20 to-transparent flex items-center justify-center border border-electric/30 mb-8 shadow-[0_0_30px_rgba(77,255,180,0.1)]">
                <Package className="w-8 h-8 text-electric" />
            </div>

            <h1 className="font-display text-4xl text-text-primary mb-4 tracking-tight">
                Welcome to Dealflow
            </h1>

            <p className="text-lg text-text-secondary mb-12 max-w-lg leading-relaxed">
                Your commerce agents will appear here once you make your first API call to register a deal context.
            </p>

            <div className="grid md:grid-cols-3 gap-6 w-full text-left">
                {/* Step 1 */}
                <div className="bg-surface border border-border-default rounded-xl p-6 relative group overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-electric/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-electric/10 transition-colors" />
                    <div className="text-xs font-mono text-electric mb-3 border border-electric/30 bg-electric/5 inline-block px-2 py-0.5 rounded">01</div>
                    <h3 className="font-medium text-text-primary mb-2">Create your API key</h3>
                    <p className="text-sm text-text-secondary mb-6 leading-relaxed">Generated exclusively for this project to authenticate requests.</p>
                    <Link href="/dashboard/keys?create=1" className="flex items-center gap-2 text-sm text-white bg-electric/10 hover:bg-electric border border-electric/30 hover:border-electric hover:text-black font-medium px-4 py-2 rounded transition-colors w-fit">
                        <KeyRound className="w-4 h-4" /> Create API Key
                    </Link>
                </div>

                {/* Step 2 */}
                <div className="bg-surface border border-border-default rounded-xl p-6 relative group overflow-hidden">
                    <div className="text-xs font-mono text-electric mb-3 border border-electric/30 bg-electric/5 inline-block px-2 py-0.5 rounded">02</div>
                    <h3 className="font-medium text-text-primary mb-2">Install the SDK</h3>
                    <p className="text-sm text-text-secondary mb-6 leading-relaxed">Available gracefully across Node.js native pipelines globally.</p>
                    <div className="bg-bg-void border border-border-dim rounded p-2 text-xs font-mono text-text-data select-all">
                        npm install @dealflow/sdk
                    </div>
                </div>

                {/* Step 3 */}
                <div className="bg-surface border border-border-default rounded-xl p-6 relative group overflow-hidden">
                    <div className="text-xs font-mono text-electric mb-3 border border-electric/30 bg-electric/5 inline-block px-2 py-0.5 rounded">03</div>
                    <h3 className="font-medium text-text-primary mb-2">Create a deal</h3>
                    <p className="text-sm text-text-secondary mb-6 leading-relaxed">Initialize a new deal context inside your agent framework natively.</p>
                    <a href="https://docs.dealflow.dev" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-electric hover:text-white transition-colors w-fit">
                        <BookOpen className="w-4 h-4" /> View quickstart →
                    </a>
                </div>
            </div>
        </div>
    )
}
