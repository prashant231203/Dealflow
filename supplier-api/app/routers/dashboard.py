from fastapi import APIRouter, Depends, Security
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db.models import Product, RFQ, Supplier
from app.core.security import get_current_supplier, bearer_scheme

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


async def _resolve_supplier(
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Supplier:
    return await get_current_supplier(credentials=credentials, db=db)


@router.get("/stats")
async def get_stats(
    supplier: Supplier = Depends(_resolve_supplier),
    db: AsyncSession = Depends(get_db),
):
    total_products = (await db.execute(
        select(func.count()).where(Product.supplier_id == supplier.id)
    )).scalar()

    rfq_counts = (await db.execute(
        select(RFQ.status, func.count().label("count"))
        .where(RFQ.supplier_id == supplier.id)
        .group_by(RFQ.status)
    )).all()

    rfq_by_status = {row.status: row.count for row in rfq_counts}
    total_rfqs = sum(rfq_by_status.values())

    revenue_result = (await db.execute(
        select(func.sum(RFQ.quoted_price * RFQ.quantity))
        .where(RFQ.supplier_id == supplier.id, RFQ.status == "accepted")
    )).scalar()

    recent_rfqs = (await db.execute(
        select(RFQ).where(RFQ.supplier_id == supplier.id)
        .order_by(RFQ.created_at.desc()).limit(5)
    )).scalars().all()

    return {
        "supplier": {"id": supplier.id, "name": supplier.name, "email": supplier.email},
        "stats": {
            "total_products": total_products or 0,
            "total_rfqs": total_rfqs,
            "pending_rfqs": rfq_by_status.get("pending", 0) + rfq_by_status.get("quoted", 0) + rfq_by_status.get("pending_review", 0),
            "accepted_rfqs": rfq_by_status.get("accepted", 0),
            "rejected_rfqs": rfq_by_status.get("rejected", 0),
            "total_revenue": round(revenue_result or 0, 2),
        },
        "recent_rfqs": [
            {
                "rfq_id": r.id,
                "product_id": r.product_id,
                "requester_id": r.requester_id,
                "quantity": r.quantity,
                "quoted_price": r.quoted_price,
                "currency": r.currency,
                "status": r.status,
                "created_at": r.created_at.isoformat(),
            }
            for r in recent_rfqs
        ],
    }
