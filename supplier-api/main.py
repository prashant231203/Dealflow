import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.db.database import init_db
from app.routers import auth, catalog, rfq, agent, dashboard

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Supplier Readiness API",
    description="Makes B2B suppliers queryable and transactable by AI procurement agents.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

logger.info("Initializing database...")
asyncio.run(init_db())
logger.info("Database initialization complete.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/v1")
app.include_router(catalog.router, prefix="/v1")
app.include_router(rfq.router, prefix="/v1")
app.include_router(agent.router, prefix="/v1")
app.include_router(dashboard.router, prefix="/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}


app.mount("/", StaticFiles(directory="static", html=True), name="static")
