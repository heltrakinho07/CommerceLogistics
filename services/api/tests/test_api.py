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

def test_shipping_regression_artifact_and_metrics():
    from app.freight_ml import get_bundle
    bundle = get_bundle()
    metadata = bundle["metadata"]
    assert metadata["source"] == "synthetic_generated_simulation"
    assert metadata["test_samples"] > 100
    for target in ("cost_mzn", "delivery_days"):
        scores = metadata["metrics"][target]["holdout_test"]
        assert scores["mae"] >= 0
        assert scores["rmse"] >= scores["mae"]
        assert scores["r2"] <= 1
    r = client.get("/api/models/shipping/metrics")
    assert r.status_code == 200
    assert r.json()["version"] == metadata["version"]


def test_freight_regression_endpoint_is_ml_and_explicitly_synthetic():
    payload = {
        "origin": "Lisboa", "destination": "Maputo", "weight_kg": 2,
        "length_cm": 35, "width_cm": 25, "height_cm": 20,
        "service": "standard", "declared_value_mzn": 1000,
    }
    resp = client.post("/api/quote/predict", json=payload)
    assert resp.status_code == 200
    result = resp.json()
    assert result["method"] == "trained_regression"
    assert result["source"] == "synthetic_generated_simulation"
    assert result["in_training_domain"] is True
    assert result["predicted_cost_mzn"] > 0
    assert result["predicted_days"] >= 1
    assert "sintéticos" in result["disclaimer"]
    assert resp.json() == client.post("/api/quote/predict", json=payload).json()
    express = client.post("/api/quote/predict", json={**payload, "service": "express"}).json()
    assert express["predicted_cost_mzn"] > 0
    assert express["predicted_days"] >= 1
    assert client.post("/api/quote/predict", json={**payload, "destination": "Lisboa"}).status_code == 422


def test_regression_flags_out_of_domain():
    q = {
        "origin": "Beira", "destination": "Pemba", "weight_kg": 120,
        "length_cm": 70, "width_cm": 65, "height_cm": 60,
        "service": "standard",
    }
    result = client.post("/api/quote/predict", json=q).json()
    assert result["in_training_domain"] is False
    assert result["predicted_cost_mzn"] >= 0
