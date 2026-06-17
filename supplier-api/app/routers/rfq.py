"""
RFQ (Request for Quote) endpoint.
This is what procurement agents call — they send a quote request,
we run the negotiation engine, and return an auto-quoted price.
"""
from fastapi import APIRouter, Depends, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db.models import Product, RFQ, Supplier
from app.core.security import get_current_supplier, bearer_scheme
from app.services.negotiation import compute_quote

router = APIRouter(prefix="/rfq", tags=["rfq"])


class RFQRequest(BaseModel):
    product_id: str
    quantity: int
    requester_id: str  # agent or buyer identifier
    requested_price: float | None = None  # agent's target price (optional)
    notes: str | None = None


class RFQResponse(BaseModel):
    rfq_id: str
    product_id: str
    product_name: str
    sku: str
    quantity: int
    unit_price: float
    total_price: float
    currency: str
    status: str
    auto_approved: bool
    compliance_flags: list[dict]
    explanation: str
    lead_time_days: int | None


async def _resolve_supplier(
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Supplier:
    return await get_current_supplier(credentials=credentials, db=db)


@router.post("/quote", response_model=RFQResponse)
async def request_quote(
    body: RFQRequest,
    supplier: Supplier = Depends(_resolve_supplier),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Product).where(Product.id == body.product_id, Product.supplier_id == supplier.id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if body.quantity <= 0:
        raise HTTPException(status_code=400, detail="quantity must be > 0")

    quote = compute_quote(product, body.quantity, body.requested_price)

    rfq_status = "quoted" if quote.auto_approved else "pending_review"
    if any(f["type"] == "below_moq" for f in quote.compliance_flags):
        rfq_status = "rejected"

    rfq = RFQ(
        supplier_id=supplier.id,
        product_id=product.id,
        requester_id=body.requester_id,
        quantity=body.quantity,
        requested_price=body.requested_price,
        quoted_price=quote.unit_price,
        currency=quote.currency,
        status=rfq_status,
        compliance_flags=quote.compliance_flags,
        notes=body.notes,
    )
    db.add(rfq)
    await db.commit()
    await db.refresh(rfq)

    return RFQResponse(
        rfq_id=rfq.id,
        product_id=product.id,
        product_name=product.name,
        sku=product.sku,
        quantity=body.quantity,
        unit_price=quote.unit_price,
        total_price=quote.total_price,
        currency=quote.currency,
        status=rfq_status,
        auto_approved=quote.auto_approved,
        compliance_flags=quote.compliance_flags,
        explanation=quote.explanation,
        lead_time_days=product.lead_time_days,
    )


@router.get("/quotes", response_model=list[dict])
async def list_rfqs(
    status: str | None = None,
    page: int = 1,
    per_page: int = 50,
    supplier: Supplier = Depends(_resolve_supplier),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(RFQ).where(RFQ.supplier_id == supplier.id)
    if status:
        stmt = stmt.where(RFQ.status == status)
    stmt = stmt.order_by(RFQ.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(stmt)
    rfqs = result.scalars().all()
    return [
        {
            "rfq_id": r.id,
            "product_id": r.product_id,
            "requester_id": r.requester_id,
            "quantity": r.quantity,
            "quoted_price": r.quoted_price,
            "currency": r.currency,
            "status": r.status,
            "compliance_flags": r.compliance_flags,
            "created_at": r.created_at.isoformat(),
        }
        for r in rfqs
    ]


@router.post("/quotes/{rfq_id}/accept", response_model=dict)
async def accept_rfq(
    rfq_id: str,
    supplier: Supplier = Depends(_resolve_supplier),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RFQ).where(RFQ.id == rfq_id, RFQ.supplier_id == supplier.id)
    )
    rfq = result.scalar_one_or_none()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    if rfq.status not in ("quoted", "pending_review"):
        raise HTTPException(status_code=409, detail=f"Cannot accept an RFQ with status '{rfq.status}'")

    rfq.status = "accepted"
    await db.commit()
    return {"rfq_id": rfq_id, "status": "accepted"}


@router.post("/quotes/{rfq_id}/reject", response_model=dict)
async def reject_rfq(
    rfq_id: str,
    supplier: Supplier = Depends(_resolve_supplier),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RFQ).where(RFQ.id == rfq_id, RFQ.supplier_id == supplier.id)
    )
    rfq = result.scalar_one_or_none()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    if rfq.status in ("accepted", "rejected"):
        raise HTTPException(status_code=409, detail=f"RFQ already {rfq.status}")

    rfq.status = "rejected"
    await db.commit()
    return {"rfq_id": rfq_id, "status": "rejected"}
