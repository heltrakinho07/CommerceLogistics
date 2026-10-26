"""CommerceLogistics AI — honest ML demonstrations and illustrative quote API."""
import os

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .catalog import Product, get_catalog, get_product
from .ml import get_index\nfrom .freight_ml import artefact_path, get_bundle, predict_shipping
from .shipping import QuoteRequest, QuoteResponse, quote_shipping

app = FastAPI(
    title="CommerceLogistics AI",
    version="0.1.0",
    description="Portfolio demonstration with synthetic products and simulated tariffs.",
)

origins = [s.strip() for s in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if s.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET", "POST"], allow_headers=["Content-Type"])


@app.get("/api/health")
def health():
    return {"status": "ok", "catalog_size": len(get_catalog()), "demo_data": True}


@app.get("/api/products", response_model=list[Product])
def products(
    category: str | None = None,
    limit: int = Query(24, ge=1, le=100),
):
    all_products = get_catalog()
    matches = [p for p in all_products if not category or p.category.lower() == category.lower()]
    return matches[:limit]


@app.get("/api/categories", response_model=list[str])
def categories():
    return sorted(set(p.category for p in get_catalog()))


@app.get("/api/search")
def search(
    q: str = Query(min_length=2, max_length=200),
    limit: int = Query(8, ge=1, le=50),
    category: str | None = None,
):
    index = get_index()
    return {"query": q, "method": index.backend, "is_demo": True,
            "results": index.search(q, limit, category)}


@app.get("/api/recommendations/{product_id}")
def recommendations(product_id: str, limit: int = Query(4, ge=1, le=30)):
    if get_product(product_id) is None:
        raise HTTPException(status_code=404, detail="Product not found")
    index = get_index()
    return {"product_id": product_id, "method": "content_based_" + index.backend,
            "is_demo": True, "results": index.similar(product_id, limit)}


@app.get("/api/models/shipping/metrics")
def shipping_metrics():
    try:
        return get_bundle()["metadata"]
    except (FileNotFoundError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/api/quote/predict")
def predict_quote(payload: QuoteRequest):
    try:
        return predict_shipping(payload)
    except (FileNotFoundError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/api/quote", response_model=QuoteResponse)
def shipping_quote(payload: QuoteRequest):
    return quote_shipping(payload)


# Optional production mode: serve the compiled React app on the same origin.
# Local Vite + FastAPI development and existing API tests remain unchanged.
static_directory = os.getenv("FRONTEND_DIST_DIR")
if static_directory:
    app.mount("/", StaticFiles(directory=static_directory, html=True), name="frontend")
