"""
Negotiation engine — ported and adapted from Dealflow's compliance + offers logic.
Computes the quoted price for an RFQ based on supplier-defined guardrails.
"""
from dataclasses import dataclass
from app.db.models import Product


@dataclass
class QuoteResult:
    quoted_price: float
    unit_price: float
    total_price: float
    currency: str
    auto_approved: bool
    compliance_flags: list[dict]
    explanation: str


def compute_quote(product: Product, quantity: int, requested_price: float | None) -> QuoteResult:
    flags = []
    now_str = __import__("datetime").datetime.utcnow().isoformat()
    currency = product.currency

    # Start from list price
    unit_price = product.list_price

    # Apply volume discount tiers (highest applicable tier wins)
    if product.discount_tiers:
        applicable = [t for t in product.discount_tiers if quantity >= t["min_qty"]]
        if applicable:
            best_tier = max(applicable, key=lambda t: t["min_qty"])
            discount_pct = best_tier["discount_pct"]
            unit_price = round(unit_price * (1 - discount_pct / 100), 4)
            flags.append({
                "type": "volume_discount_applied",
                "message": f"Volume discount of {discount_pct}% applied for qty {quantity}",
                "severity": "info",
                "detected_at": now_str,
            })

    # Check MOQ
    if quantity < product.moq:
        flags.append({
            "type": "below_moq",
            "message": f"Requested quantity {quantity} is below minimum order quantity of {product.moq}",
            "severity": "critical",
            "detected_at": now_str,
        })

    # If agent sent a requested_price, validate against floor
    if requested_price is not None:
        requested_unit = requested_price / quantity if quantity > 0 else requested_price
        floor = product.price_floor or 0

        if floor > 0 and requested_unit < floor:
            flags.append({
                "type": "price_floor_violated",
                "message": f"Requested unit price {requested_unit:.4f} {currency} is below price floor {floor} {currency}",
                "severity": "critical",
                "detected_at": now_str,
            })
            # Floor the unit price, don't accept below floor
            unit_price = max(unit_price, floor)
        elif requested_unit < unit_price:
            # Agent wants cheaper than computed — flag but still quote our price
            flags.append({
                "type": "counter_offer",
                "message": f"Requested price {requested_unit:.4f} {currency}/unit is below our quote of {unit_price:.4f} {currency}/unit",
                "severity": "warning",
                "detected_at": now_str,
            })

    total_price = round(unit_price * quantity, 4)
    critical_flags = [f for f in flags if f["severity"] == "critical"]
    auto_approved = len(critical_flags) == 0

    explanation = _build_explanation(unit_price, quantity, total_price, currency, flags)

    return QuoteResult(
        quoted_price=unit_price,
        unit_price=unit_price,
        total_price=total_price,
        currency=currency,
        auto_approved=auto_approved,
        compliance_flags=flags,
        explanation=explanation,
    )


def _build_explanation(unit_price, quantity, total, currency, flags) -> str:
    parts = [f"{quantity} units @ {unit_price:.4f} {currency}/unit = {total:.4f} {currency}"]
    for f in flags:
        if f["severity"] != "info":
            parts.append(f"[{f['severity'].upper()}] {f['message']}")
    return ". ".join(parts)
