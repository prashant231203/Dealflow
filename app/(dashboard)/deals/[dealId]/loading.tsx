import { SkeletonBlock, SkeletonRow } from '@/components/shared/SkeletonGeometry'

export default function DealDetailLoading() {
    return (
        <div className="max-w-[1400px] mx-auto h-[calc(100vh-80px)] flex flex-col space-y-6">
            <div className="shrink-0 flex justify-between items-start">
                <div>
                    <div className="h-8 w-[400px] skeleton-shimmer bg-border-dim rounded-md mb-3" />
                    <div className="h-4 w-64 skeleton-shimmer bg-border-dim rounded-md" />
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-8">
                <div className="flex-1 bg-surface border border-border-default rounded-xl p-6">
                    <div className="h-6 w-40 skeleton-shimmer bg-border-dim rounded-md mb-8" />
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex gap-4 mb-8">
                            <div className="w-8 h-8 rounded-full skeleton-shimmer bg-border-dim shrink-0" />
                            <div className="flex-1">
                                <div className="h-4 w-32 skeleton-shimmer bg-border-dim rounded-md mb-2" />
                                <div className="h-20 w-full skeleton-shimmer bg-border-dim rounded-md" />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="w-full lg:w-[480px] shrink-0 space-y-6">
                    <SkeletonBlock className="h-48" />
                    <SkeletonBlock className="h-32" />
                    <SkeletonBlock className="h-64" />
                </div>
            </div>
        </div>
    )
}
