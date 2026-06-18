import hashlib
import secrets
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import ApiKey, Supplier

bearer_scheme = HTTPBearer()


def generate_api_key() -> tuple[str, str]:
    """Returns (raw_key, key_hash). Store only the hash."""
    raw = "sup_" + secrets.token_urlsafe(32)
    key_hash = hashlib.sha256(raw.encode()).hexdigest()
    prefix = raw[:10]
    return raw, key_hash, prefix


def hash_key(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


async def get_current_supplier(
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
    db: AsyncSession = None,
) -> Supplier:
    raw_key = credentials.credentials
    key_hash = hash_key(raw_key)

    result = await db.execute(
        select(ApiKey).where(ApiKey.key_hash == key_hash, ApiKey.active == True)  # noqa: E712
    )
    api_key = result.scalar_one_or_none()
    if not api_key:
        raise HTTPException(status_code=401, detail="Invalid or revoked API key")

    result = await db.execute(select(Supplier).where(Supplier.id == api_key.supplier_id))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=401, detail="Supplier not found")

    return supplier
