"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  Deal: () => Deal,
  Dealflow: () => Dealflow,
  DealflowError: () => DealflowError
});
module.exports = __toCommonJS(index_exports);

// src/errors.ts
var DealflowError = class _DealflowError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = "DealflowError";
    this.code = code;
    this.status = status;
    Object.setPrototypeOf(this, _DealflowError.prototype);
  }
  /**
   * Create a DealflowError from an API error response body.
   */
  static fromResponse(body) {
    return new _DealflowError(
      body.error ?? body.message ?? "Unknown API error",
      body.code ?? "UNKNOWN_ERROR",
      body.status ?? 500
    );
  }
  toString() {
    return `DealflowError [${this.code}] (${this.status}): ${this.message}`;
  }
};

// src/deal.ts
var Deal = class {
  constructor(data, client) {
    this._client = client;
    Object.assign(this, data);
  }
  // ── Computed Getters ────────────────────────────────────────────────
  /** Human-readable summary. Falls back to a constructed string if no AI summary is available. */
  get summary() {
    if (this.current_summary && this.current_summary.length > 0) return this.current_summary;
    return `${this.type} deal for: ${this.intent}. Status: ${this.status}.`;
  }
  /** The current best offer, or null. */
  get bestOffer() {
    return this.current_best_offer ?? null;
  }
  /** All offers with status 'pending'. */
  get pendingOffers() {
    return (this.offers ?? []).filter((offer) => offer.status === "pending");
  }
  /** The first accepted offer, or null. */
  get acceptedOffer() {
    return (this.offers ?? []).find((offer) => offer.status === "accepted") ?? null;
  }
  /** True if the deal has an expiry date that is in the past. */
  get isExpired() {
    return this.expires_at ? new Date(this.expires_at) < /* @__PURE__ */ new Date() : false;
  }
  /** True if the deal is closed, cancelled, or expired. */
  get isClosed() {
    return ["closed", "cancelled", "expired"].includes(this.status);
  }
  /** True if the deal is in 'active' status. */
  get isActive() {
    return this.status === "active";
  }
  /** True if any compliance flag has severity 'critical'. */
  get hasComplianceIssues() {
    return this.compliance_flags.some((flag) => flag.severity === "critical");
  }
  /** All compliance flags with severity 'critical'. */
  get criticalFlags() {
    return this.compliance_flags.filter((flag) => flag.severity === "critical");
  }
  /** All compliance flags with severity 'warning'. */
  get warningFlags() {
    return this.compliance_flags.filter((flag) => flag.severity === "warning");
  }
  /**
   * Duration of the deal in milliseconds.
   * If closed, returns `closed_at - created_at`.
   * If still open, returns `now - created_at`.
   * Returns 0 if `created_at` is missing (avoids NaN).
   */
  get durationMs() {
    if (!this.created_at) return 0;
    const start = new Date(this.created_at).getTime();
    if (Number.isNaN(start)) return 0;
    const end = this.closed_at ? new Date(this.closed_at).getTime() : Date.now();
    if (Number.isNaN(end)) return 0;
    return end - start;
  }
  // ── Core Action Method ──────────────────────────────────────────────
  /**
   * Perform any deal action. Sends the request to the API, updates local
   * state from the response, and returns `this` for optional chaining.
   */
  async act(action, payload) {
    const { actor, ...rest } = payload;
    const response = await this._client._request(
      "POST",
      `/api/v1/deals/${this.id}/actions`,
      { action, actor, payload: rest }
    );
    Object.assign(this, response.deal);
    return this;
  }
  // ── Convenience Action Methods ──────────────────────────────────────
  /** Submit a new offer. */
  async offer(params) {
    return this.act("offer", { ...params });
  }
  /** Counter an existing offer. */
  async counter(params) {
    return this.act("counter", { ...params });
  }
  /** Accept an offer by ID. */
  async accept(params) {
    return this.act("accept", { ...params });
  }
  /** Reject an offer by ID. */
  async reject(params) {
    return this.act("reject", { ...params });
  }
  /** Withdraw an offer by ID. */
  async withdraw(params) {
    return this.act("withdraw", { ...params });
  }
  /** Escalate the deal to a different handler. */
  async escalate(params) {
    return this.act("escalate", { ...params });
  }
  /** Reassign the deal to a different handler. */
  async reassign(to, actor) {
    return this.act("reassign", { to, actor });
  }
  /** Pause the deal. */
  async pause(actor, reason) {
    return this.act("pause", { actor, reason });
  }
  /**
   * Resume a paused deal. Note: the action string sent to the API is
   * `resume_process` (snake_case), not camelCase.
   */
  async resumeProcess(actor) {
    return this.act("resume_process", { actor });
  }
  /** Close the deal with an outcome. */
  async close(params) {
    return this.act("close", { ...params });
  }
  /** Cancel the deal. */
  async cancel(actor, reason) {
    return this.act("cancel", { actor, reason });
  }
  /** Add a note to the deal. */
  async note(content, actor) {
    return this.act("note", { content, actor });
  }
  /** Flag a compliance issue. */
  async flag(params) {
    return this.act("flag", { ...params });
  }
  // ── Utility Methods ─────────────────────────────────────────────────
  /** Refresh local state from the API without taking an action. */
  async refresh() {
    const response = await this._client._request("GET", `/api/v1/deals/${this.id}`);
    Object.assign(this, response.deal);
    return this;
  }
  /** Return a plain JSON-serialisable representation of the deal. */
  toJSON() {
    return {
      id: this.id,
      developer_id: this.developer_id,
      type: this.type,
      intent: this.intent,
      status: this.status,
      parties: this.parties,
      current_handler: this.current_handler,
      constraints: this.constraints,
      current_summary: this.current_summary,
      current_best_offer: this.current_best_offer,
      compliance_flags: this.compliance_flags,
      metadata: this.metadata,
      tags: this.tags,
      created_at: this.created_at,
      updated_at: this.updated_at,
      expires_at: this.expires_at,
      closed_at: this.closed_at,
      outcome: this.outcome,
      final_value: this.final_value,
      final_currency: this.final_currency,
      history: this.history,
      offers: this.offers
    };
  }
};

// src/client.ts
var VALID_DEAL_TYPES = ["negotiation", "procurement", "return", "sales", "custom"];
var Dealflow = class {
  constructor(config) {
    if (!config.apiKey || typeof config.apiKey !== "string" || config.apiKey.trim().length === 0) {
      throw new Error("Dealflow: apiKey is required");
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? "https://api.dealflow.dev").replace(/\/+$/, "");
  }
  // ── Public API ──────────────────────────────────────────────────────
  /** The deals namespace — `create`, `resume`, and `list`. */
  get deals() {
    return {
      create: (data) => this._createDeal(data),
      resume: (dealId) => this._resumeDeal(dealId),
      list: (filters) => this._listDeals(filters)
    };
  }
  // ── Internal API Methods ────────────────────────────────────────────
  async _createDeal(data) {
    if (!data.type || !VALID_DEAL_TYPES.includes(data.type)) {
      throw new DealflowError(
        `type must be one of: ${VALID_DEAL_TYPES.join(", ")}`,
        "INVALID_REQUEST",
        400
      );
    }
    if (!data.intent || typeof data.intent !== "string" || data.intent.trim().length === 0) {
      throw new DealflowError("intent must be a non-empty string", "INVALID_REQUEST", 400);
    }
    const response = await this._request("POST", "/api/v1/deals", data);
    return new Deal(response.deal, this);
  }
  async _resumeDeal(dealId) {
    if (!dealId || typeof dealId !== "string" || dealId.trim().length === 0) {
      throw new DealflowError("dealId must be a non-empty string", "INVALID_REQUEST", 400);
    }
    const response = await this._request("GET", `/api/v1/deals/${dealId}`);
    return new Deal(response.deal, this);
  }
  async _listDeals(filters) {
    const params = new URLSearchParams();
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value === void 0 || value === null) continue;
        if (Array.isArray(value)) {
          params.set(key, value.join(","));
        } else {
          params.set(key, String(value));
        }
      }
    }
    const query = params.toString();
    const path = query ? `/api/v1/deals?${query}` : "/api/v1/deals";
    return this._request("GET", path);
  }
  // ── HTTP Layer ──────────────────────────────────────────────────────
  /**
   * Make an authenticated HTTP request to the Dealflow API.
   * @internal — exposed for Deal class, not part of the public API.
   */
  async _request(method, path, body) {
    let response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: body !== void 0 ? JSON.stringify(body) : void 0
      });
    } catch {
      throw new DealflowError(
        "Network error \u2014 could not reach Dealflow API",
        "NETWORK_ERROR",
        0
      );
    }
    if (!response.ok) {
      let errorBody;
      try {
        errorBody = await response.json();
      } catch {
        throw new DealflowError(
          `HTTP ${response.status}: ${response.statusText}`,
          "UNKNOWN_ERROR",
          response.status
        );
      }
      throw DealflowError.fromResponse(errorBody);
    }
    return await response.json();
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Deal,
  Dealflow,
  DealflowError
});
//# sourceMappingURL=index.cjs.map