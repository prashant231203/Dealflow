from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from pydantic import BaseModel
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db.models import Product, Supplier
from app.core.security import get_current_supplier, bearer_scheme
from app.services.catalog import parse_csv
from fastapi.security import HTTPAuthorizationCredentials
from fastapi import Security

router = APIRouter(prefix="/catalog", tags=["catalog"])


class ProductIn(BaseModel):
    sku: str
    name: str
    description: str | None = None
    category: str | None = None
    unit: str = "unit"
    list_price: float
    currency: str = "USD"
    moq: int = 1
    lead_time_days: int | None = None
    stock_available: int | None = None
    price_floor: float | None = None
    discount_tiers: list[dict] | None = None


class ProductOut(BaseModel):
    id: str
    supplier_id: str
    sku: str
    name: str
    description: str | None
    category: str | None
    unit: str
    list_price: float
    currency: str
    moq: int
    lead_time_days: int | None
    stock_available: int | None
    price_floor: float | None
    discount_tiers: list[dict] | None

    model_config = {"from_attributes": True}


async def _resolve_supplier(
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Supplier:
    return await get_current_supplier(credentials=credentials, db=db)


@router.post("/upload-csv")
async def upload_csv(
    file: UploadFile = File(...),
    supplier: Supplier = Depends(_resolve_supplier),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files accepted")

    content = await file.read()
    products, errors = parse_csv(content, supplier.id)

    if errors and not products:
        raise HTTPException(status_code=422, detail={"errors": errors})

    for p in products:
        db.add(p)
    await db.commit()

    return {
        "imported": len(products),
        "errors": errors,
        "message": f"Imported {len(products)} products with {len(errors)} row errors.",
    }


@router.post("/products", response_model=ProductOut)
async def create_product(
    body: ProductIn,
    supplier: Supplier = Depends(_resolve_supplier),
    db: AsyncSession = Depends(get_db),
):
    product = Product(supplier_id=supplier.id, **body.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


@router.get("/products", response_model=list[ProductOut])
async def list_products(
    q: str | None = Query(None, description="Search by name, SKU, or category"),
    category: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    in_stock: bool | None = None,
    page: int = 1,
    per_page: int = 50,
    supplier: Supplier = Depends(_resolve_supplier),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Product).where(Product.supplier_id == supplier.id)

    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(Product.name.ilike(like), Product.sku.ilike(like), Product.category.ilike(like))
        )
    if category:
        stmt = stmt.where(Product.category == category)
    if min_price is not None:
        stmt = stmt.where(Product.list_price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Product.list_price <= max_price)
    if in_stock is True:
        stmt = stmt.where(Product.stock_available > 0)

    stmt = stmt.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/products/{product_id}", response_model=ProductOut)
async def get_product(
    product_id: str,
    supplier: Supplier = Depends(_resolve_supplier),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.supplier_id == supplier.id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.patch("/products/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: str,
    body: ProductIn,
    supplier: Supplier = Depends(_resolve_supplier),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.supplier_id == supplier.id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    await db.commit()
    await db.refresh(product)
    return product


@router.delete("/products/{product_id}", status_code=204)
async def delete_product(
    product_id: str,
    supplier: Supplier = Depends(_resolve_supplier),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.supplier_id == supplier.id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.delete(product)
    await db.commit()
