import { cn } from '@/lib/utils'

interface SkeletonRowProps {
    columns: number[] // array of widths like [100, 200, 50]
    className?: string
    rowClassName?: string
}

export function SkeletonRow({ columns, className, rowClassName }: SkeletonRowProps) {
    return (
        <div className={cn("flex items-center gap-4 py-4 px-4 border-b border-border-dim opacity-50", className)}>
            {columns.map((width, i) => (
                <div
                    key={i}
                    className={cn("h-4 rounded-md skeleton-shimmer", rowClassName)}
                    style={{ width: `${width}px` }}
                />
            ))}
        </div>
    )
}

export function SkeletonBlock({ className }: { className?: string }) {
    return (
        <div className={cn("rounded-lg bg-surface border border-border-default", className)}>
            <div className="p-4">
                <div className="h-4 w-1/3 rounded-md skeleton-shimmer mb-6" />
                <div className="space-y-3">
                    <div className="h-3 w-full rounded-md skeleton-shimmer" />
                    <div className="h-3 w-5/6 rounded-md skeleton-shimmer" />
                    <div className="h-3 w-4/6 rounded-md skeleton-shimmer" />
                </div>
            </div>
        </div>
    )
}
