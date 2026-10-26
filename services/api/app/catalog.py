"""Synthetic catalogue: never represent the fixtures as real stock or prices."""
import json
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

CATALOG_PATH = Path(__file__).resolve().parents[3] / "data" / "sample" / "products.json"


class Product(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    name: str
    description: str
    category: str
    price_mzn: float = Field(ge=0)
    rating: float = Field(ge=0, le=5)
    popularity: int = Field(ge=0)
    tags: list[str]


@lru_cache(maxsize=1)
def get_catalog() -> tuple[Product, ...]:
    with CATALOG_PATH.open(encoding="utf-8") as f:
        products = tuple(Product.model_validate(row) for row in json.load(f))
    ids = [p.id for p in products]
    if len(set(ids)) != len(ids):
        raise ValueError("Duplicate product IDs in catalogue")
    return products


def get_product(product_id: str) -> Product | None:
    return next((p for p in get_catalog() if p.id == product_id), None)
