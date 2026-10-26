import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.ml import SearchIndex, expand_query
from app.catalog import get_catalog
from app.shipping import QuoteRequest, quote_shipping

client = TestClient(app)


def test_health_and_catalog():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["demo_data"] is True
    catalog = client.get("/api/products").json()
    assert len(catalog) >= 12
    assert len({p["id"] for p in catalog}) == len(catalog)


def test_search_has_real_scoring():
    response = client.get("/api/search", params={"q": "laptop programacao", "limit": 5})
    assert response.status_code == 200
    data = response.json()
    assert data["method"] == "tfidf"
    assert data["results"]
    assert all(0 < hit["score"] <= 1 for hit in data["results"])
    assert data["results"][0]["product"]["category"] == "Computadores"


def test_search_invalid_and_category_filter():
    assert client.get("/api/search", params={"q": "x"}).status_code == 422
    assert client.get("/api/search", params={"q": "portatil", "limit": 0}).status_code == 422
    result = client.get("/api/search", params={"q": "smartphone", "category": "Telemóveis"}).json()
    assert all(hit["product"]["category"] == "Telemóveis" for hit in result["results"])


def test_recommendations_and_not_found():
    result = client.get("/api/recommendations/p001?limit=4")
    assert result.status_code == 200
    ids = [hit["product"]["id"] for hit in result.json()["results"]]
    assert len(ids) == 4 and "p001" not in ids
    assert client.get("/api/recommendations/no-such-item").status_code == 404


def test_synonyms():
    assert "laptop" in expand_query("portátil para estudante")


def test_shipping_volumetric_weight_and_demo_disclosure():
    payload = {
        "origin": "Lisboa", "destination": "Maputo", "weight_kg": 1,
        "length_cm": 50, "width_cm": 40, "height_cm": 30,
        "service": "standard", "declared_value_mzn": 1000,
    }
    r = client.post("/api/quote", json=payload)
    assert r.status_code == 200
    q = r.json()
    assert q["volumetric_weight_kg"] == 12
    assert q["billed_weight_kg"] == 12
    assert q["total_mzn"] == 1800 + 12 * 490 + 15
    assert q["is_demo"] is True
    assert q["method"] == "illustrative_rules"


@pytest.mark.parametrize("field,value", [
    ("weight_kg", -1), ("length_cm", 0), ("declared_value_mzn", -5),
    ("origin", "unknown"), ("destination", "Lisboa"), ("service", "hyperfast")
])
def test_quote_validation(field, value):
    payload = {
        "origin": "Lisboa", "destination": "Maputo", "weight_kg": 1,
        "length_cm": 20, "width_cm": 20, "height_cm": 20,
    }
    payload[field] = value
    assert client.post("/api/quote", json=payload).status_code == 422


def test_route_and_express():
    q = {
        "origin": "Maputo", "destination": "Beira", "weight_kg": 2,
        "length_cm": 20, "width_cm": 20, "height_cm": 20,
    }
    std = client.post("/api/quote", json=q).json()
    exp = client.post("/api/quote", json={**q, "service": "express"}).json()
    assert exp["total_mzn"] > std["total_mzn"]
    assert exp["estimated_days_max"] <= std["estimated_days_max"]
    assert client.post("/api/quote", json={**q, "destination": "Maputo"}).status_code == 422


def test_index_ranking_is_repeatable():
    index = SearchIndex(get_catalog())
    first = index.search("computador portatil", 5)
    assert first == index.search("computador portatil", 5)
