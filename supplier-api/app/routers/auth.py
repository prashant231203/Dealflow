from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db.models import Supplier, ApiKey
from app.core.security import generate_api_key

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr


class RegisterResponse(BaseModel):
    supplier_id: str
    api_key: str  # shown once, never again
    message: str


@router.post("/register", response_model=RegisterResponse)
async def register_supplier(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Supplier).where(Supplier.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    supplier = Supplier(name=body.name, email=body.email)
    db.add(supplier)
    await db.flush()

    raw_key, key_hash, prefix = generate_api_key()
    api_key = ApiKey(supplier_id=supplier.id, key_hash=key_hash, prefix=prefix)
    db.add(api_key)
    await db.commit()

    return RegisterResponse(
        supplier_id=supplier.id,
        api_key=raw_key,
        message="Save this API key — it will not be shown again.",
    )
