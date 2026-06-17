import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.db.database import Base, get_db
from app.db.models import Supplier, ApiKey, Product, RFQ  # noqa: F401
from main import app

TEST_DB = "sqlite+aiosqlite:///./test.db"
test_engine = create_async_engine(TEST_DB, echo=False)
TestSession = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_db():
    async with TestSession() as session:
        yield session


app.dependency_overrides[get_db] = override_db


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def supplier_token(client):
    resp = await client.post("/v1/auth/register", json={"name": "Acme Corp", "email": "acme@test.com"})
    assert resp.status_code == 200
    return resp.json()["api_key"]


@pytest.mark.asyncio
async def test_register(client):
    resp = await client.post("/v1/auth/register", json={"name": "Test Supplier", "email": "test@supplier.com"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["api_key"].startswith("sup_")
    assert "supplier_id" in data


@pytest.mark.asyncio
async def test_duplicate_register(client):
    body = {"name": "Dup", "email": "dup@test.com"}
    await client.post("/v1/auth/register", json=body)
    resp = await client.post("/v1/auth/register", json=body)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_create_product(client, supplier_token):
    resp = await client.post(
        "/v1/catalog/products",
        json={"sku": "SKU-001", "name": "Widget A", "list_price": 10.0, "moq": 5},
        headers={"Authorization": f"Bearer {supplier_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["sku"] == "SKU-001"
    assert data["list_price"] == 10.0


@pytest.mark.asyncio
async def test_rfq_auto_quote(client, supplier_token):
    prod_resp = await client.post(
        "/v1/catalog/products",
        json={
            "sku": "SKU-002",
            "name": "Bolt Pack",
            "list_price": 5.0,
            "moq": 10,
            "price_floor": 3.0,
            "discount_tiers": [{"min_qty": 100, "discount_pct": 10}],
        },
        headers={"Authorization": f"Bearer {supplier_token}"},
    )
    product_id = prod_resp.json()["id"]
    supplier_id = prod_resp.json()["supplier_id"]

    # Agent requests a quote for 200 units
    rfq_resp = await client.post(
        "/v1/agent/rfq",
        json={
            "supplier_id": supplier_id,
            "product_id": product_id,
            "quantity": 200,
            "requester_id": "agent-procurement-001",
        },
    )
    assert rfq_resp.status_code == 200
    data = rfq_resp.json()
    assert data["status"] == "quoted"
    assert data["auto_approved"] is True
    # 10% discount applied: 5.0 * 0.9 = 4.5
    assert data["unit_price"] == pytest.approx(4.5)
    assert data["total_price"] == pytest.approx(900.0)


@pytest.mark.asyncio
async def test_rfq_below_moq(client, supplier_token):
    prod_resp = await client.post(
        "/v1/catalog/products",
        json={"sku": "SKU-003", "name": "Gear", "list_price": 20.0, "moq": 50},
        headers={"Authorization": f"Bearer {supplier_token}"},
    )
    product_id = prod_resp.json()["id"]
    supplier_id = prod_resp.json()["supplier_id"]

    rfq_resp = await client.post(
        "/v1/agent/rfq",
        json={"supplier_id": supplier_id, "product_id": product_id, "quantity": 5, "requester_id": "agent-x"},
    )
    assert rfq_resp.status_code == 200
    data = rfq_resp.json()
    assert data["status"] == "rejected"
    assert any(f["type"] == "below_moq" for f in data["compliance_flags"])


@pytest.mark.asyncio
async def test_rfq_price_floor_violation(client, supplier_token):
    prod_resp = await client.post(
        "/v1/catalog/products",
        json={"sku": "SKU-004", "name": "Pipe", "list_price": 8.0, "moq": 1, "price_floor": 6.0},
        headers={"Authorization": f"Bearer {supplier_token}"},
    )
    product_id = prod_resp.json()["id"]
    supplier_id = prod_resp.json()["supplier_id"]

    # Agent tries to lowball at $2/unit total for 1 unit
    rfq_resp = await client.post(
        "/v1/agent/rfq",
        json={"supplier_id": supplier_id, "product_id": product_id, "quantity": 1, "requester_id": "agent-y", "requested_price": 2.0},
    )
    data = rfq_resp.json()
    assert any(f["type"] == "price_floor_violated" for f in data["compliance_flags"])
    # Should quote at floor, not requested price
    assert data["unit_price"] >= 6.0


@pytest.mark.asyncio
async def test_csv_upload(client, supplier_token):
    csv_content = b"sku,name,list_price,moq,category\nSKU-CSV-1,CSV Product,15.0,5,Electronics\n"
    resp = await client.post(
        "/v1/catalog/upload-csv",
        files={"file": ("products.csv", csv_content, "text/csv")},
        headers={"Authorization": f"Bearer {supplier_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["imported"] == 1
