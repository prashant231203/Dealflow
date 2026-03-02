type DealStatus = 'active' | 'paused' | 'escalated' | 'closed' | 'expired' | 'cancelled';
type DealType = 'negotiation' | 'procurement' | 'return' | 'sales' | 'custom';
type DealAction = 'offer' | 'counter' | 'accept' | 'reject' | 'withdraw' | 'pause' | 'resume_process' | 'escalate' | 'reassign' | 'close' | 'cancel' | 'note' | 'attach' | 'flag' | 'update_constraints';
type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';
interface DealParty {
    id: string;
    role: string;
    type: 'agent' | 'human';
}
interface DealConstraints {
    budget_max?: number;
    budget_min?: number;
    currency?: string;
    deadline?: string;
    quantity?: number;
    unit?: string;
    product_id?: string;
    requirements?: string[];
    custom?: Record<string, unknown>;
}
interface DealOffer {
    id: string;
    deal_id: string;
    made_by: string;
    price: number;
    currency: string;
    quantity?: number;
    unit?: string;
    conditions?: string[];
    includes?: string[];
    notes?: string;
    status: OfferStatus;
    responded_by?: string;
    response_note?: string;
    within_budget?: boolean | null;
    meets_requirements?: boolean;
    created_at: string;
    expires_at?: string;
    responded_at?: string;
}
interface DealEvent {
    id: string;
    deal_id: string;
    action: DealAction;
    actor: string;
    payload: Record<string, unknown>;
    summary_before?: string;
    summary_after?: string;
    sequence_number: number;
    created_at: string;
}
interface ComplianceFlag {
    type: 'price_floor_violated' | 'over_budget' | 'deadline_missed' | 'unauthorized_action' | 'policy_violation' | 'missing_requirements' | 'expired_deal' | 'custom';
    message: string;
    severity: 'warning' | 'critical';
    action_id?: string;
    detected_at: string;
    acknowledged_at?: string;
}
interface DealData {
    id: string;
    developer_id: string;
    type: DealType;
    intent: string;
    status: DealStatus;
    parties: DealParty[];
    current_handler?: string;
    constraints: DealConstraints;
    current_summary?: string;
    current_best_offer?: DealOffer | null;
    compliance_flags: ComplianceFlag[];
    metadata: Record<string, unknown>;
    tags: string[];
    created_at: string;
    updated_at: string;
    expires_at?: string;
    closed_at?: string;
    outcome?: 'completed' | 'cancelled' | 'expired' | 'failed';
    final_value?: number;
    final_currency?: string;
    history?: DealEvent[];
    offers?: DealOffer[];
}
interface CreateDealRequest {
    type: DealType;
    intent: string;
    parties?: DealParty[];
    constraints?: DealConstraints;
    metadata?: Record<string, unknown>;
    tags?: string[];
    expires_in?: number;
}
interface DealListFilters {
    status?: DealStatus;
    type?: DealType;
    current_handler?: string;
    tags?: string[];
    created_after?: string;
    created_before?: string;
    search?: string;
    page?: number;
    per_page?: number;
}
interface DealListResponse {
    deals: DealData[];
    total: number;
    page: number;
    per_page: number;
}
interface ActOnDealRequest {
    action: DealAction;
    actor: string;
    payload: Record<string, unknown>;
}
interface OfferPayload {
    price: number;
    currency?: string;
    quantity?: number;
    unit?: string;
    conditions?: string[];
    includes?: string[];
    notes?: string;
    expires_in?: number;
}
interface CounterPayload extends OfferPayload {
    in_response_to?: string;
}
interface AcceptPayload {
    offer_id: string;
    notes?: string;
}
interface RejectPayload {
    offer_id: string;
    reason?: string;
}
interface WithdrawPayload {
    offer_id: string;
    reason?: string;
}
interface EscalatePayload {
    to: string;
    reason: string;
    context?: string;
}
interface ReassignPayload {
    to: string;
}
interface ClosePayload {
    outcome: 'completed' | 'cancelled' | 'failed';
    final_value?: number;
    final_currency?: string;
    notes?: string;
}
interface PausePayload {
    reason?: string;
}
interface NotePayload {
    content: string;
}
interface FlagPayload {
    type: ComplianceFlag['type'];
    message: string;
    severity: ComplianceFlag['severity'];
}
interface DealflowConfig {
    apiKey: string;
    baseUrl?: string;
}

/**
 * Represents a single commerce deal. Wraps the raw API data and provides
 * typed convenience methods for every deal action.
 *
 * After any action method is called, the local properties are automatically
 * updated from the API response — no need to call `refresh()` manually.
 */
declare class Deal {
    readonly id: string;
    readonly developer_id: string;
    readonly type: DealType;
    readonly intent: string;
    status: DealStatus;
    parties: DealParty[];
    current_handler?: string;
    constraints: DealConstraints;
    current_summary?: string;
    current_best_offer?: DealOffer | null;
    compliance_flags: ComplianceFlag[];
    metadata: Record<string, unknown>;
    tags: string[];
    created_at: string;
    updated_at: string;
    expires_at?: string;
    closed_at?: string;
    outcome?: 'completed' | 'cancelled' | 'expired' | 'failed';
    final_value?: number;
    final_currency?: string;
    history?: DealEvent[];
    offers?: DealOffer[];
    /** @internal */
    private readonly _client;
    constructor(data: DealData, client: Dealflow);
    /** Human-readable summary. Falls back to a constructed string if no AI summary is available. */
    get summary(): string;
    /** The current best offer, or null. */
    get bestOffer(): DealOffer | null;
    /** All offers with status 'pending'. */
    get pendingOffers(): DealOffer[];
    /** The first accepted offer, or null. */
    get acceptedOffer(): DealOffer | null;
    /** True if the deal has an expiry date that is in the past. */
    get isExpired(): boolean;
    /** True if the deal is closed, cancelled, or expired. */
    get isClosed(): boolean;
    /** True if the deal is in 'active' status. */
    get isActive(): boolean;
    /** True if any compliance flag has severity 'critical'. */
    get hasComplianceIssues(): boolean;
    /** All compliance flags with severity 'critical'. */
    get criticalFlags(): ComplianceFlag[];
    /** All compliance flags with severity 'warning'. */
    get warningFlags(): ComplianceFlag[];
    /**
     * Duration of the deal in milliseconds.
     * If closed, returns `closed_at - created_at`.
     * If still open, returns `now - created_at`.
     * Returns 0 if `created_at` is missing (avoids NaN).
     */
    get durationMs(): number;
    /**
     * Perform any deal action. Sends the request to the API, updates local
     * state from the response, and returns `this` for optional chaining.
     */
    act(action: DealAction, payload: {
        actor: string;
        [key: string]: unknown;
    }): Promise<this>;
    /** Submit a new offer. */
    offer(params: OfferPayload & {
        actor: string;
    }): Promise<this>;
    /** Counter an existing offer. */
    counter(params: CounterPayload & {
        actor: string;
    }): Promise<this>;
    /** Accept an offer by ID. */
    accept(params: AcceptPayload & {
        actor: string;
    }): Promise<this>;
    /** Reject an offer by ID. */
    reject(params: RejectPayload & {
        actor: string;
    }): Promise<this>;
    /** Withdraw an offer by ID. */
    withdraw(params: WithdrawPayload & {
        actor: string;
    }): Promise<this>;
    /** Escalate the deal to a different handler. */
    escalate(params: EscalatePayload & {
        actor: string;
    }): Promise<this>;
    /** Reassign the deal to a different handler. */
    reassign(to: string, actor: string): Promise<this>;
    /** Pause the deal. */
    pause(actor: string, reason?: string): Promise<this>;
    /**
     * Resume a paused deal. Note: the action string sent to the API is
     * `resume_process` (snake_case), not camelCase.
     */
    resumeProcess(actor: string): Promise<this>;
    /** Close the deal with an outcome. */
    close(params: ClosePayload & {
        actor: string;
    }): Promise<this>;
    /** Cancel the deal. */
    cancel(actor: string, reason?: string): Promise<this>;
    /** Add a note to the deal. */
    note(content: string, actor: string): Promise<this>;
    /** Flag a compliance issue. */
    flag(params: FlagPayload & {
        actor: string;
    }): Promise<this>;
    /** Refresh local state from the API without taking an action. */
    refresh(): Promise<this>;
    /** Return a plain JSON-serialisable representation of the deal. */
    toJSON(): DealData;
}

/**
 * The main entry point for the Dealflow SDK.
 *
 * ```ts
 * const df = new Dealflow({ apiKey: 'df_live_...' })
 * const deal = await df.deals.create({ type: 'negotiation', intent: 'Buy 100 units' })
 * ```
 */
declare class Dealflow {
    private readonly apiKey;
    private readonly baseUrl;
    constructor(config: DealflowConfig);
    /** The deals namespace — `create`, `resume`, and `list`. */
    get deals(): {
        create: (data: CreateDealRequest) => Promise<Deal>;
        resume: (dealId: string) => Promise<Deal>;
        list: (filters?: DealListFilters) => Promise<DealListResponse>;
    };
    private _createDeal;
    private _resumeDeal;
    private _listDeals;
    /**
     * Make an authenticated HTTP request to the Dealflow API.
     * @internal — exposed for Deal class, not part of the public API.
     */
    _request<T>(method: string, path: string, body?: unknown): Promise<T>;
}

declare class DealflowError extends Error {
    readonly code: string;
    readonly status: number;
    constructor(message: string, code: string, status: number);
    /**
     * Create a DealflowError from an API error response body.
     */
    static fromResponse(body: {
        error?: string;
        message?: string;
        code?: string;
        status?: number;
    }): DealflowError;
    toString(): string;
}

export { type AcceptPayload, type ActOnDealRequest, type ClosePayload, type ComplianceFlag, type CounterPayload, type CreateDealRequest, Deal, type DealAction, type DealConstraints, type DealData, type DealEvent, type DealListFilters, type DealListResponse, type DealOffer, type DealParty, type DealStatus, type DealType, Dealflow, type DealflowConfig, DealflowError, type EscalatePayload, type FlagPayload, type NotePayload, type OfferPayload, type OfferStatus, type PausePayload, type ReassignPayload, type RejectPayload, type WithdrawPayload };
