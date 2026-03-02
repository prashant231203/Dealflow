import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
    icon: LucideIcon
    title: string
    description: string
    action?: {
        label: string
        onClick?: () => void
        href?: string
    }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center animate-fade-up">
            <div className="w-16 h-16 rounded-full bg-elevated border border-border-default flex items-center justify-center mb-6 shadow-sm">
                <Icon className="w-8 h-8 text-text-muted" strokeWidth={1.5} />
            </div>

            <h3 className="font-display text-xl text-text-primary mb-2 font-medium">
                {title}
            </h3>

            <p className="text-text-secondary max-w-sm mx-auto mb-8 leading-relaxed">
                {description}
            </p>

            {action && action.href ? (
                <a
                    href={action.href}
                    className="flex items-center gap-2 bg-transparent text-electric border border-electric/30 hover:bg-electric/10 px-6 py-2.5 rounded-md transition-colors font-medium text-sm"
                >
                    {action.label}
                </a>
            ) : action && action.onClick ? (
                <button
                    onClick={action.onClick}
                    className="flex items-center gap-2 bg-transparent text-electric border border-electric/30 hover:bg-electric/10 px-6 py-2.5 rounded-md transition-colors font-medium text-sm focus-visible:outline-electric"
                >
                    {action.label}
                </button>
            ) : null}
        </div>
    )
}
