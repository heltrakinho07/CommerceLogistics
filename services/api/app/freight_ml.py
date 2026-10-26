"""Experimental freight/ETA regressors trained only on generated, fictional data.

No real carrier transactions, tariffs or delivery outcomes are used. Scores
describe generalisation to a random held-out part of the same simulator only.
"""
from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from .shipping import QuoteRequest

MODEL_VERSION = "demo-synthetic-v1"
DEFAULT_ARTIFACT_PATH = Path(__file__).resolve().parents[1] / "models" / "freight.joblib"
ORIGINS = ("Maputo", "Beira", "Nampula", "Lisboa")
DESTINATIONS = ("Maputo", "Matola", "Beira", "Nampula", "Pemba")
DATA_SOURCE = "synthetic_generated_simulation"
TARGETS = ("cost_mzn", "delivery_days")


def artefact_path() -> Path:
    return Path(os.getenv("FREIGHT_MODEL_PATH", str(DEFAULT_ARTIFACT_PATH)))


def feature_vector(order: QuoteRequest) -> np.ndarray:
    volume = order.length_cm * order.width_cm * order.height_cm / 5000
    billed = max(order.weight_kg, volume)
    return np.asarray([
        order.weight_kg, volume, billed,
        np.log1p(billed), order.length_cm / 100, order.width_cm / 100,
        order.height_cm / 100, order.declared_value_mzn / 1000,
        1 if order.service == "express" else 0,
        *[int(order.origin == place) for place in ORIGINS],
        *[int(order.destination == place) for place in DESTINATIONS],
    ], dtype=float)


def generated_examples(count: int = 1800, seed: int = 20261026):
    """Generate hypothetical transport outcomes; units and patterns are fictional."""
    rng = np.random.default_rng(seed)
    features, prices, days = [], [], []
    for _ in range(count):
        origin = ORIGINS[int(rng.integers(len(ORIGINS)))]
        destination = DESTINATIONS[int(rng.integers(len(DESTINATIONS)))]
        if origin == destination:
            destination = DESTINATIONS[(DESTINATIONS.index(destination) + 1) % len(DESTINATIONS)]
        weight = float(rng.uniform(0.3, 42))
        dimensions = rng.uniform(10, 105, size=3)
        declared = float(rng.uniform(0, 45000))
        express = rng.random() < 0.35
        payload = QuoteRequest(
            origin=origin, destination=destination, weight_kg=weight,
            length_cm=float(dimensions[0]), width_cm=float(dimensions[1]),
            height_cm=float(dimensions[2]), declared_value_mzn=declared,
            service="express" if express else "standard",
        )
        vector = feature_vector(payload)
        billed = float(vector[2])
        intl = origin == "Lisboa"
        north = destination in ("Nampula", "Pemba") or origin == "Nampula"
        # Synthetic outcome generator: not derived from prices paid by clients.
        base = 1600 if intl else (530 if north else 290)
        unit_rate = 415 if intl else (125 if north else 78)
        route_variation = {"Maputo": 0, "Matola": 42, "Beira": 120, "Nampula": 215, "Pemba": 300}[destination]
        price = (
            (base + route_variation + unit_rate * billed * (1 + 0.035 * np.sqrt(billed)))
            * (1.46 if express else 1.0)
            + 0.013 * declared
        )
        price = max(80.0, price + float(rng.normal(0, 0.055 * price)))
        eta = (10.6 if intl else (5.5 if north else 2.8))
        eta += 0.25 * np.sqrt(billed) + (0.3 if destination == "Pemba" else 0)
        eta *= 0.68 if express else 1.0
        eta = max(1.0, eta + float(rng.normal(0, 0.85)))
        features.append(vector)
        prices.append(price)
        days.append(eta)
    return np.stack(features), np.stack([prices, days], axis=1)


def _candidates():
    return {
        "ridge": make_pipeline(StandardScaler(), Ridge(alpha=10.0)),
        "random_forest": RandomForestRegressor(
            n_estimators=70, max_depth=12, min_samples_leaf=3, n_jobs=1, random_state=42
        ),
        "hist_gradient_boosting": HistGradientBoostingRegressor(
            max_iter=110, max_leaf_nodes=19, learning_rate=0.10,
            l2_regularization=1.0, random_state=42,
        ),
    }


def _scores(truth: np.ndarray, predicted: np.ndarray):
    return {
        "mae": round(float(mean_absolute_error(truth, predicted)), 3),
        "rmse": round(float(np.sqrt(mean_squared_error(truth, predicted))), 3),
        "r2": round(float(r2_score(truth, predicted)), 4),
    }


def train_model(path: Path | None = None, count: int = 1800) -> dict:
    """Split into train/selection/untouched test (70/15/15), save estimators."""
    if count < 150:
        raise ValueError("Need at least 150 synthetic examples")
    x, y = generated_examples(count)
    indexes = np.arange(len(x))
    train_ix, held_ix = train_test_split(indexes, test_size=0.30, random_state=42)
    valid_ix, test_ix = train_test_split(held_ix, test_size=0.50, random_state=42)
    models = {}
    metrics = {}
    for idx, target in enumerate(TARGETS):
        validation = {}
        for name, estimator in _candidates().items():
            estimator.fit(x[train_ix], y[train_ix, idx])
            validation[name] = _scores(
                y[valid_ix, idx], estimator.predict(x[valid_ix])
            )
        # Choose on validation only; test remains untouched until selection ends.
        chosen = min(validation, key=lambda name: validation[name]["mae"])
        best = _candidates()[chosen]
        fit_ix = np.concatenate((train_ix, valid_ix))
        best.fit(x[fit_ix], y[fit_ix, idx])
        predictions = best.predict(x[test_ix])
        naive = DummyRegressor(strategy="median").fit(x[fit_ix], y[fit_ix, idx])
        models[target] = best
        metrics[target] = {
            "selected_model": chosen,
            "validation_candidates": validation,
            "holdout_test": _scores(y[test_ix, idx], predictions),
            "naive_median_test": _scores(y[test_ix, idx], naive.predict(x[test_ix])),
            "unit": "MZN" if target == "cost_mzn" else "days",
        }
    metadata = {
        "version": MODEL_VERSION, "source": DATA_SOURCE,
        "training_samples": len(train_ix), "validation_samples": len(valid_ix),
        "test_samples": len(test_ix), "random_seed": 20261026,
        "evaluation_note": (
            "Scores are from held-out fictional examples generated by one simulator; "
            "not validated on real Mozambican shipments, tariffs or delivery times."
        ),
        "metrics": metrics,
    }
    output = path or artefact_path()
    output.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"metadata": metadata, "models": models}, output, compress=3)
    (output.parent / "freight_metrics.json").write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    get_bundle.cache_clear()
    return metadata


@lru_cache(maxsize=1)
def get_bundle():
    path = artefact_path()
    if not path.exists():
        raise FileNotFoundError(
            "Freight model artefact unavailable. Run PYTHONPATH=services/api python ml/train_shipping.py"
        )
    # joblib uses pickle: load only the trusted locally-built artefact.
    bundle = joblib.load(path)
    if bundle["metadata"]["version"] != MODEL_VERSION:
        raise RuntimeError("Shipping model version mismatch")
    return bundle


def predict_shipping(order: QuoteRequest) -> dict:
    bundle = get_bundle()
    features = feature_vector(order).reshape(1, -1)
    cost = max(0.0, float(bundle["models"]["cost_mzn"].predict(features)[0]))
    days = max(1.0, float(bundle["models"]["delivery_days"].predict(features)[0]))
    volumetric = float(features[0, 1])
    billed = float(features[0, 2])
    domain = (order.weight_kg <= 42 and max(order.length_cm, order.width_cm, order.height_cm) <= 105
              and order.declared_value_mzn <= 45000 and volumetric <= 230)
    return {
        "predicted_cost_mzn": round(cost, 2),
        "predicted_days": round(days, 1),
        "estimated_days_min": max(1, int(np.floor(days - 1))),
        "estimated_days_max": max(2, int(np.ceil(days + 1))),
        "actual_weight_kg": round(order.weight_kg, 2),
        "volumetric_weight_kg": round(volumetric, 2),
        "billed_weight_kg": round(billed, 2),
        "currency": "MZN",
        "method": "trained_regression",
        "model_version": bundle["metadata"]["version"],
        "source": DATA_SOURCE,
        "in_training_domain": bool(domain),
        "is_demo": True,
        "disclaimer": (
            "Previsão experimental treinada com dados inteiramente sintéticos. "
            "Não representa preços, prazos ou desempenho real de transportadoras."
        ),
    }
