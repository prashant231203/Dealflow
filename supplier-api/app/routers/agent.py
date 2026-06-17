"""
Public agent-facing endpoints — no supplier auth required.
Procurement agents use these to discover and query supplier catalogs.
Suppliers register their catalog; agents query it via a public supplier slug or ID.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db.models import Product, Supplier, RFQ
from app.services.negotiation import compute_quote
from pydantic import BaseModel

router = APIRouter(prefix="/agent", tags=["agent"])


class AgentRFQRequest(BaseModel):
    supplier_id: str
    product_id: str
    quantity: int
    requester_id: str
    requested_price: float | None = None


@router.get("/suppliers/{supplier_id}/catalog")
async def get_supplier_catalog(
    supplier_id: str,
    q: str | None = Query(None),
    category: str | None = None,
    max_price: float | None = None,
    page: int = 1,
    per_page: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """
    Procurement agents call this to browse a supplier's catalog.
    Returns structured, machine-readable product data.
    """
    supplier_result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = supplier_result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    stmt = select(Product).where(Product.supplier_id == supplier_id)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(Product.name.ilike(like), Product.sku.ilike(like), Product.category.ilike(like))
        )
    if category:
        stmt = stmt.where(Product.category == category)
    if max_price is not None:
        stmt = stmt.where(Product.list_price <= max_price)

    stmt = stmt.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(stmt)
    products = result.scalars().all()

    return {
        "supplier": {"id": supplier.id, "name": supplier.name},
        "products": [
            {
                "id": p.id,
                "sku": p.sku,
                "name": p.name,
                "description": p.description,
                "category": p.category,
                "unit": p.unit,
                "list_price": p.list_price,
                "currency": p.currency,
                "moq": p.moq,
                "lead_time_days": p.lead_time_days,
                "in_stock": (p.stock_available or 0) > 0,
                # price_floor is intentionally omitted — internal to supplier
            }
            for p in products
        ],
        "page": page,
        "per_page": per_page,
    }


@router.post("/rfq")
async def agent_request_quote(
    body: AgentRFQRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Procurement agents submit an RFQ here.
    No auth needed on the agent side — the supplier's API key scopes the catalog.
    Returns an instant quoted price based on supplier's guardrails.
    """
    product_result = await db.execute(
        select(Product).where(
            Product.id == body.product_id,
            Product.supplier_id == body.supplier_id,
        )
    )
    product = product_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found for this supplier")

    if body.quantity <= 0:
        raise HTTPException(status_code=400, detail="quantity must be > 0")

    quote = compute_quote(product, body.quantity, body.requested_price)
    rfq_status = "quoted" if quote.auto_approved else "pending_review"
    if any(f["type"] == "below_moq" for f in quote.compliance_flags):
        rfq_status = "rejected"

    rfq = RFQ(
        supplier_id=body.supplier_id,
        product_id=product.id,
        requester_id=body.requester_id,
        quantity=body.quantity,
        requested_price=body.requested_price,
        quoted_price=quote.unit_price,
        currency=quote.currency,
        status=rfq_status,
        compliance_flags=quote.compliance_flags,
    )
    db.add(rfq)
    await db.commit()
    await db.refresh(rfq)

    return {
        "rfq_id": rfq.id,
        "supplier_id": body.supplier_id,
        "product": {
            "id": product.id,
            "sku": product.sku,
            "name": product.name,
        },
        "quantity": body.quantity,
        "unit_price": quote.unit_price,
        "total_price": quote.total_price,
        "currency": quote.currency,
        "status": rfq_status,
        "auto_approved": quote.auto_approved,
        "compliance_flags": quote.compliance_flags,
        "explanation": quote.explanation,
        "lead_time_days": product.lead_time_days,
    }
