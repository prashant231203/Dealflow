import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AiSummaryPanelProps {
    summary?: string
    isLoading?: boolean
}

export function AiSummaryPanel({ summary, isLoading }: AiSummaryPanelProps) {
    return (
        <div className="relative rounded-xl bg-[#0F141A] border border-electric/40 shadow-[0_4px_30px_rgba(77,255,180,0.08)] overflow-hidden">
            {/* Background glowing sweep */}
            <div
                className="absolute inset-0 bg-gradient-to-br from-electric/10 to-transparent pointer-events-none"
            />

            {/* Top electric bar */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-electric to-transparent opacity-50" />

            <div className="p-5 md:p-6 relative z-10">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-electric animate-pulse duration-[3000ms]" />
                    <h3 className="font-display font-bold text-electric text-sm tracking-wide uppercase">
                        Deal Intelligence
                    </h3>
                </div>

                {isLoading ? (
                    <div className="space-y-3">
                        <div className="h-4 bg-electric/10 rounded-md w-[85%] loading-shimmer" />
                        <div className="h-4 bg-electric/10 rounded-md w-[95%] loading-shimmer" />
                        <div className="h-4 bg-electric/10 rounded-md w-[60%] loading-shimmer" />
                    </div>
                ) : !summary ? (
                    <p className="text-text-muted text-sm italic">
                        Waiting for enough context to generate an intelligence brief.
                    </p>
                ) : (() => {
                    try {
                        const parsed = JSON.parse(summary)
                        return (
                            <div className="text-sm text-text-primary leading-relaxed space-y-4 animate-fade-up">
                                {parsed.active_constraints && Object.keys(parsed.active_constraints).length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-xs uppercase tracking-widest text-[#4D9FFF] font-semibold">Active Constraints</h4>
                                        <ul className="space-y-1">
                                            {Object.entries(parsed.active_constraints).map(([k, v], i) => (
                                                <li key={i} className="flex gap-2 items-start"><span className="text-electric">✓</span> <span><span className="font-semibold text-white/90">{k}:</span> {String(v)}</span></li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {parsed.verifiable_evidence_ids?.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-xs uppercase tracking-widest text-warning font-semibold">Evidence Citations</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {parsed.verifiable_evidence_ids.map((id: string, i: number) => (
                                                <span key={i} className="font-mono text-[10px] bg-warning/10 text-warning px-1.5 py-0.5 rounded border border-warning/30">
                                                    {id}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {parsed.suggested_next_action && (
                                    <div className="mt-4 border-t border-border-dim pt-3 flex flex-col gap-2">
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="uppercase tracking-widest text-text-muted">Recommendation:</span>
                                            <span className="font-mono bg-electric/10 text-electric px-2 py-0.5 rounded border border-electric/30">
                                                {parsed.suggested_next_action.action}
                                            </span>
                                        </div>
                                        <p className="text-xs text-text-muted italic">{parsed.suggested_next_action.reason}</p>
                                    </div>
                                )}
                            </div>
                        )
                    } catch {
                        return (
                            <div className="text-sm text-text-primary leading-relaxed space-y-3 animate-fade-up style-bullets">
                                {summary.split('\n\n').map((paragraph, i) => (
                                    <p key={i}>{paragraph}</p>
                                ))}
                            </div>
                        )
                    }
                })()}
            </div>

            <style jsx global>{`
        .style-bullets ul {
          list-style-type: none;
          padding-left: 1.5rem;
          margin-top: 0.5rem;
        }
        .style-bullets ul li::before {
          content: "•";
          color: var(--electric);
          font-weight: bold;
          display: inline-block;
          width: 1em;
          margin-left: -1em;
        }
      `}</style>
        </div>
    )
}
