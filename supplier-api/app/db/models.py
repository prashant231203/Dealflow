import uuid
from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


def new_id() -> str:
    return str(uuid.uuid4())


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    api_keys: Mapped[list["ApiKey"]] = relationship(back_populates="supplier")
    products: Mapped[list["Product"]] = relationship(back_populates="supplier")
    rfqs: Mapped[list["RFQ"]] = relationship(back_populates="supplier")


class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    supplier_id: Mapped[str] = mapped_column(ForeignKey("suppliers.id"), nullable=False)
    key_hash: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    prefix: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    supplier: Mapped["Supplier"] = relationship(back_populates="api_keys")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    supplier_id: Mapped[str] = mapped_column(ForeignKey("suppliers.id"), nullable=False)
    sku: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String, nullable=True)
    unit: Mapped[str] = mapped_column(String, default="unit")
    list_price: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String, default="USD")
    moq: Mapped[int] = mapped_column(Integer, default=1)
    lead_time_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stock_available: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Negotiation guardrails — supplier sets these, agents must respect them
    price_floor: Mapped[float | None] = mapped_column(Float, nullable=True)
    discount_tiers: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # e.g. [{"min_qty": 100, "discount_pct": 10}, {"min_qty": 500, "discount_pct": 15}]

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    supplier: Mapped["Supplier"] = relationship(back_populates="products")


class RFQ(Base):
    __tablename__ = "rfqs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    supplier_id: Mapped[str] = mapped_column(ForeignKey("suppliers.id"), nullable=False)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"), nullable=False)
    requester_id: Mapped[str] = mapped_column(String, nullable=False)  # agent or buyer ID
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    requested_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    quoted_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String, default="USD")
    status: Mapped[str] = mapped_column(String, default="pending")
    # pending | quoted | accepted | rejected | expired
    compliance_flags: Mapped[list | None] = mapped_column(JSON, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    supplier: Mapped["Supplier"] = relationship(back_populates="rfqs")
