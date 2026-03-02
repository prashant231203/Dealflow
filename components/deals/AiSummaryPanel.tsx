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
                ) : (
                    <div className="text-sm text-text-primary leading-relaxed space-y-3 animate-fade-up style-bullets">
                        {summary.split('\n\n').map((paragraph, i) => (
                            <p key={i}>{paragraph}</p>
                        ))}
                    </div>
                )}
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
