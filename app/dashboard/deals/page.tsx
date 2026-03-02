import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { DealStatusDot } from '@/components/deals/DealStatusDot'
import { RelativeTime } from '@/components/shared/RelativeTime'
import { EmptyState } from '@/components/shared/EmptyState'
import { CopyButton } from '@/components/shared/CopyButton'
import { Filter, ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import { DealSearchInput } from '@/components/deals/DealSearchInput'

export const dynamic = 'force-dynamic'

export default async function DealsListPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams;
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page, 10) : 1
    const limit = 20
    const offset = (page - 1) * limit
    const statusFilter = typeof searchParams.status === 'string' ? searchParams.status : 'all'
    const handlerFilter = typeof searchParams.handler === 'string' ? searchParams.handler : 'all'

    let query = supabase
        .from('deals')
        .select('*', { count: 'exact' })
        .eq('developer_id', user.id)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1)

    if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
    }
    if (handlerFilter !== 'all') {
        // If we wanted to search handlers we could. For simplicity, skipped in backend if unused
    }

    const { data: deals, count } = await query

    const totalPages = count ? Math.ceil(count / limit) : 1

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="font-display text-2xl text-text-primary mb-1">Deals</h1>
                    <p className="text-text-secondary text-sm">All commerce processes routed through your API key.</p>
                </div>

                {/* Global Filter Bar */}
                <div className="flex items-center gap-3">
                    <DealSearchInput />

                    <div className="flex items-center gap-2 border border-border-default bg-surface rounded-md px-1 py-1">
                        <Link
                            href="/dashboard/deals?status=all"
                            className={`px-3 py-1 text-sm rounded ${statusFilter === 'all' ? 'bg-overlay text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary'}`}
                        >
                            All
                        </Link>
                        <Link
                            href="/dashboard/deals?status=active"
                            className={`px-3 py-1 text-sm rounded ${statusFilter === 'active' ? 'bg-overlay text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary'}`}
                        >
                            Active
                        </Link>
                        <Link
                            href="/dashboard/deals?status=escalated"
                            className={`px-3 py-1 text-sm rounded ${statusFilter === 'escalated' ? 'bg-overlay text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary'}`}
                        >
                            Escalated
                        </Link>
                        <Link
                            href="/dashboard/deals?status=closed"
                            className={`px-3 py-1 text-sm rounded ${statusFilter === 'closed' ? 'bg-overlay text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary'}`}
                        >
                            Closed
                        </Link>
                    </div>
                </div>
            </div>

            {!deals || deals.length === 0 ? (
                <div className="bg-surface border border-border-default rounded-xl">
                    <EmptyState
                        icon={Inbox}
                        title="No deals found"
                        description={statusFilter !== 'all' ? `No deals matching status: ${statusFilter}` : 'No deals have been created yet.'}
                    />
                </div>
            ) : (
                <div className="bg-surface border border-border-default rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border-dim bg-overlay/30 text-xs font-medium text-text-muted uppercase tracking-wider">
                                    <th className="py-3 px-4 font-normal">Deal ID</th>
                                    <th className="py-3 px-4 font-normal">Intent</th>
                                    <th className="py-3 px-4 font-normal">Status</th>
                                    <th className="py-3 px-4 font-normal">Type</th>
                                    <th className="py-3 px-4 font-normal">Last Updated</th>
                                    <th className="py-3 px-4 font-normal text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-dim">
                                {deals.map((deal) => (
                                    <tr key={deal.id} className="hover:bg-overlay transition-colors group">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <Link href={`/dashboard/deals/${deal.id}`} className="font-mono text-xs text-electric hover:underline underline-offset-4">
                                                    {deal.id.slice(0, 14)}...
                                                </Link>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <CopyButton value={deal.id} size="sm" className="bg-transparent border-transparent" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="text-sm font-medium text-text-primary max-w-[300px] truncate block" title={deal.intent}>
                                                {deal.intent}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <DealStatusDot status={deal.status} />
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="text-xs uppercase tracking-wider text-text-secondary bg-elevated px-2 py-0.5 rounded border border-border-dim">
                                                {deal.type}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-xs text-text-secondary">
                                            <RelativeTime timestamp={deal.updated_at} />
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <Link
                                                href={`/dashboard/deals/${deal.id}`}
                                                className="text-xs font-medium text-text-secondary hover:text-white transition-colors border border-border-dim rounded px-3 py-1.5 hover:bg-elevated focus-visible:outline-electric"
                                            >
                                                View Details
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    {totalPages > 1 && (
                        <div className="px-4 py-3 border-t border-border-dim flex items-center justify-between text-sm">
                            <span className="text-text-secondary">
                                Showing {offset + 1} to {Math.min(offset + limit, count || 0)} of {count}
                            </span>
                            <div className="flex items-center gap-2">
                                <Link
                                    href={`/dashboard/deals?page=${Math.max(1, page - 1)}&status=${statusFilter}`}
                                    className={`p-1.5 border border-border-dim rounded-md transition-colors ${page === 1 ? 'opacity-50 pointer-events-none' : 'hover:bg-elevated hover:text-white text-text-secondary'}`}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Link>
                                <div className="font-mono text-xs text-text-muted px-2">
                                    Page {page} of {totalPages}
                                </div>
                                <Link
                                    href={`/dashboard/deals?page=${Math.min(totalPages, page + 1)}&status=${statusFilter}`}
                                    className={`p-1.5 border border-border-dim rounded-md transition-colors ${page === totalPages ? 'opacity-50 pointer-events-none' : 'hover:bg-elevated hover:text-white text-text-secondary'}`}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
