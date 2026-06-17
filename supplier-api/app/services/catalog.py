"""
Catalog ingestion — parses CSV uploads into normalized Product rows.
"""
import io
import pandas as pd
from app.db.models import Product


REQUIRED_COLUMNS = {"sku", "name", "list_price"}
OPTIONAL_COLUMNS = {
    "description", "category", "unit", "currency",
    "moq", "lead_time_days", "stock_available",
    "price_floor",
}


def parse_csv(content: bytes, supplier_id: str) -> tuple[list[Product], list[str]]:
    """Returns (products, errors). Products are unsaved ORM objects."""
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        return [], [f"Could not parse CSV: {e}"]

    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        return [], [f"Missing required columns: {', '.join(sorted(missing))}"]

    products = []
    errors = []

    for i, row in df.iterrows():
        row_num = i + 2  # 1-indexed + header row
        try:
            list_price = float(row["list_price"])
            if list_price <= 0:
                errors.append(f"Row {row_num}: list_price must be > 0")
                continue

            product = Product(
                supplier_id=supplier_id,
                sku=str(row["sku"]).strip(),
                name=str(row["name"]).strip(),
                list_price=list_price,
                description=_opt_str(row, "description"),
                category=_opt_str(row, "category"),
                unit=_opt_str(row, "unit") or "unit",
                currency=_opt_str(row, "currency") or "USD",
                moq=_opt_int(row, "moq") or 1,
                lead_time_days=_opt_int(row, "lead_time_days"),
                stock_available=_opt_int(row, "stock_available"),
                price_floor=_opt_float(row, "price_floor"),
            )
            products.append(product)
        except Exception as e:
            errors.append(f"Row {row_num}: {e}")

    return products, errors


def _opt_str(row, col) -> str | None:
    val = row.get(col)
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    return str(val).strip() or None


def _opt_int(row, col) -> int | None:
    val = row.get(col)
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return None


def _opt_float(row, col) -> float | None:
    val = row.get(col)
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None
