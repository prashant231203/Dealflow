from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.db.database import init_db
from app.routers import auth, catalog, rfq, agent


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Supplier Readiness API",
    description="Makes B2B suppliers queryable and transactable by AI procurement agents.",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(auth.router, prefix="/v1")
app.include_router(catalog.router, prefix="/v1")
app.include_router(rfq.router, prefix="/v1")
app.include_router(agent.router, prefix="/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}
