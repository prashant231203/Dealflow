import { SkeletonBlock, SkeletonRow } from '@/components/shared/SkeletonGeometry'

export default function DealsLoading() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <div className="h-6 w-32 skeleton-shimmer bg-border-dim rounded-md mb-2" />
                    <div className="h-4 w-64 skeleton-shimmer bg-border-dim rounded-md" />
                </div>
                <div className="flex gap-2">
                    <div className="h-8 w-40 skeleton-shimmer bg-border-dim rounded-md" />
                </div>
            </div>

            <div className="bg-surface border border-border-default rounded-xl overflow-hidden shadow-sm">
                <SkeletonRow columns={[120, 250, 80, 80, 100, 60]} className="bg-overlay/30 border-b border-border-dim" />
                {Array.from({ length: 10 }).map((_, i) => (
                    <SkeletonRow
                        key={i}
                        columns={[100, 300, 80, 80, 80, 60]}
                    />
                ))}
            </div>
        </div>
    )
}
