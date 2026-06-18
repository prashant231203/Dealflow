import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.db.database import init_db
from app.routers import auth, catalog, rfq, agent, dashboard

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Application startup: beginning initialization...")
    try:
        await init_db()
        logger.info("Application startup: initialization complete, ready to serve requests.")
    except Exception:
        logger.exception("Application startup: initialization failed — app may not function correctly.")
        raise
    yield
    logger.info("Application shutdown.")


app = FastAPI(
    title="Supplier Readiness API",
    description="Makes B2B suppliers queryable and transactable by AI procurement agents.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

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


@app.get("/")
async def root():
    return {"status": "ok", "message": "Supplier Readiness API is running"}


app.mount("/", StaticFiles(directory="static", html=True), name="static")
