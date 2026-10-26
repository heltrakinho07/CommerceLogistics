# CommerceLogistics AI

**End-to-end machine learning engineering portfolio** — smart product discovery, content-based recommendations, and transparent illustrative shipping quotes. Built independently for a technical portfolio; **not affiliated with any logistics company**.

> **Data integrity:** All included products, ratings, and shipping tariffs are **fictional demonstration data**. The default search system uses a trained TF-IDF vector model (not a transformer embedding model); optional multilingual sentence-transformer embeddings can be enabled. Shipping includes a **trained supervised regression model** alongside an independent deterministic rule baseline. The ML model learns **entirely synthetic generated outcomes**, never observed commercial freight data. All predictions are experimental, not real quotes or validated logistics performance. No evaluation numbers are claimed without execution.

## Features

| Module | Endpoint | Method |
|---|---|---|
| Product discovery | `GET /api/search?q=...` | TF-IDF cosine similarity; optional multilingual embeddings |
| Catalogue | `GET /api/products` | Synthetic local dataset |
| Similar products | `GET /api/recommendations/{id}` | Content-based similarity with category weighting |
| Shipping baseline | `POST /api/quote` | Deterministic illustrative tariffs; no ML |
| Shipping regression | `POST /api/quote/predict` | Trained regression on synthetic examples; predicts cost and ETA |
| Model evaluation | `GET /api/models/shipping/metrics` | Held-out synthetic MAE, RMSE, R² and candidate comparison |
| Diagnostics | `GET /api/health` and `GET /docs` | Readiness and OpenAPI |

## Publish on Render (one service, one URL)

The root [`render.yaml`](render.yaml) Blueprint deploys the portfolio demo as **one free Docker web service**. A multi-stage [`Dockerfile.render`](Dockerfile.render) compiles React and then serves its static assets via the FastAPI process, so **the browser and the API share the same origin**. This avoids a separate API URL, CORS configuration and two idling services. This single-service setup is for a compact portfolio demo; for higher traffic use separate static-site and API services.

1. Sign in at [Render Dashboard](https://dashboard.render.com/) and connect the GitHub account owning `heltrakinho07/CommerceLogistics`.
2. Choose **New → Blueprint**, select this repository and branch `main`.
3. Verify Render detects `render.yaml`; confirm **plan: Free**, **runtime: Docker** and the listed service `commercelogistics-ai`.
4. Review any usage/billing prompts and click **Deploy Blueprint**.
5. Open **the exact `.onrender.com` URL shown by Render**. Do not assume a subdomain before Render assigns it.
6. Test `/`, `/api/health`, `/api/search?q=laptop` and `/docs` on that URL.

The Render process listens on `0.0.0.0` and the platform's `PORT` (default `10000`). Updates to `main` are configured to auto-deploy **only after GitHub checks pass**. No external API keys or databases are required.

**Limits:** Render Free instances have 512 MiB RAM and spin down after 15 minutes without traffic. The next request can take around a minute to wake the service. The default `SEARCH_BACKEND=tfidf` is deliberately light; **do not switch to sentence-transformers on the Free instance** without capacity/load testing. The tiny freight regression artefact is trained during Docker build and loaded at runtime. Only use synthetic catalogue products and simulated shipping fees on this public demo. Deploying the Blueprint requires access to your own Render account; committing these files does not itself provision a service.

### Test the Render image locally

```bash
docker build -f Dockerfile.render -t commerce-render .
docker run --rm -p 10000:10000 -e PORT=10000 commerce-render
```

Open `http://localhost:10000` (frontend) and `http://localhost:10000/docs` (API). CI automatically builds this image and verifies HTTP responses and compiled JavaScript assets.

## Start with Docker

Requires Docker Compose.

```bash
git clone https://github.com/heltrakinho07/CommerceLogistics.git
cd CommerceLogistics
docker compose up --build
```

Open **http://localhost:5173** for the dashboard, or **http://localhost:8000/docs** for interactive API documentation.

### Manual development

```bash
python -m venv .venv
# Linux/macOS: source .venv/bin/activate
# Windows: .venv\Scripts\activate
pip install -r services/api/requirements.txt
pip install -r services/api/requirements-dev.txt
PYTHONPATH=services/api uvicorn app.main:app --reload
```

In a second terminal:

```bash
cd apps/web
npm install
npm run dev
```

On Windows PowerShell, set `$env:PYTHONPATH="services/api"` before starting Uvicorn.

## API examples

```bash
curl "http://localhost:8000/api/search?q=portatil%20para%20programacao&limit=5"
curl "http://localhost:8000/api/recommendations/p001?limit=4"
curl -X POST http://localhost:8000/api/quote -H "Content-Type: application/json" -d '{"origin":"Lisboa","destination":"Maputo","weight_kg":2,"length_cm":30,"width_cm":20,"height_cm":15,"service":"standard","declared_value_mzn":5000}'
```

## Model transparency

- **Search baseline (ready by default):** scikit-learn word (1–2 gram) and character (3–5 gram) TF-IDF trained on the in-repo toy catalogue. Queries are optionally expanded with a small Portuguese/Mozambican glossary. This is lexical retrieval rather than contextual sentence understanding.
- **Optional semantic embeddings:** `pip install -r services/api/requirements-embeddings.txt` and `SEARCH_BACKEND=sentence-transformers`. Uses `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, downloaded on first use. This requires connectivity, extra CPU/RAM, and model licensing review for use beyond the demo.
- **Recommendations:** content-based product similarity, with a deterministic same-category boost. No customer purchase history is included: this is **not collaborative filtering**.
- **Shipping baseline:** `POST /api/quote` retains the deterministic illustrated tariff, weight, volumetric weight and express/coverage breakdown. It is **not** an ML forecast.
- **Trained freight and ETA regression:** `POST /api/quote/predict` loads a scikit-learn artefact trained from a seeded generator, compares Ridge, Random Forest and Histogram Gradient Boosting on validation, refits the selected model without touching the final test sample, and reports held-out MAE/RMSE/R² per target. `GET /api/models/shipping/metrics` makes the experiment auditable. These are **simulation-only** results: no observational shipping prices, actual delivery times or real customers.
- **Scope:** The model is not validated for Mozambican carriers, long-range extrapolation or genuine quotes. Synthetic test scores cannot establish commercial accuracy. The frontend shows the ML prediction alongside a separate rule-engine reference.

### Browser end-to-end tests

The Playwright suite starts the real **FastAPI** service and **Vite** interface, then exercises API-backed search, product filters, recommendations, freight quotes, validation errors and mobile navigation.

```bash
# At repository root, with Python installed and the API dependencies available:
pip install -r services/api/requirements-dev.txt
cd apps/web
npm install
npx playwright install chromium
npm test
```

GitHub Actions also checks a production Docker Compose startup and requests to the frontend via Nginx reverse proxy. See [CI](.github/workflows/ci.yml).

### Freight model training and test methodology

```bash
# From repository root after installing Python requirements:
PYTHONPATH=services/api python ml/train_shipping.py
# Generated (gitignored) artefacts:
# services/api/models/freight.joblib
# services/api/models/freight_metrics.json
PYTHONPATH=services/api pytest -q services/api/tests
```

The generator has a fixed seed and creates **1,800 wholly fictional examples** (not carrier records). We split 70% training / 15% model selection / 15% untouched test, comparing Ridge, Random Forest and Histogram Gradient Boosting by validation MAE. The chosen model is refitted on training+validation and evaluated once on the held-out test. We report MAE, RMSE, R² and a median-value baseline separately for cost in MZN and time in days. These metrics are **only about the simulated data generator**, never real freight accuracy or deployment readiness.

For commercially defensible predictions, obtain authorised actual freight prices and shipment-delivery timestamps, remove leakage, hold out later periods and unseen routes, assess drift, and calibrate prediction ranges.

### Evaluation (no invented results)

```bash
PYTHONPATH=services/api python ml/evaluate_search.py
PYTHONPATH=services/api pytest -q services/api/tests
```

The search benchmark uses a *small manually labelled demo set* in `data/sample/search_queries.json`; it reports Precision@5, Recall@5 and nDCG@5 for the baseline and **must not be interpreted as a production accuracy estimate**. Replace toy data with licensed ESCI (and labelled local-language queries) for a meaningful benchmark, and use the Olist dataset to train a separate freight model after cleaning, leakage checks and jurisdiction-specific calibration.

## Project structure

```text
apps/web/                React + TypeScript + Vite dashboard + Playwright browser tests
services/api/app/        FastAPI contracts, ML retrieval, catalog, quote logic
services/api/tests/      Integration and validation tests
data/sample/             Clearly-labelled synthetic product and label fixtures
ml/evaluate_search.py    Reproducible precision/recall/nDCG benchmark
ml/train_shipping.py     Generated freight data, model fitting and test metrics
.github/workflows/ci.yml  Python unit/API, React build, Playwright and Docker smoke tests
docker-compose.yml       Web and API
```

## Roadmap

1. Ingest licensed Amazon ESCI labels and compare BM25 / TF-IDF / multilingual embeddings.
2. Add PostgreSQL + pgvector for persistent ANN retrieval, pagination, and relevance logging.
3. Train a shipping estimator validated on representative, authorised transactional freight data.
4. Add privacy-safe events and offline evaluation for recommendation strategies.
5. Add model registry, experiment tracking, latency budgets and production observability.

**Language:** Portuguese (Mozambique); prices displayed in MZN, all demo-only.

MIT-licensed source code; third-party training corpora and models retain their own terms.
