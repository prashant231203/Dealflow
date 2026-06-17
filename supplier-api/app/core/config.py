from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./supplier_api.db"
    app_name: str = "Supplier Readiness API"
    debug: bool = False

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
