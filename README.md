# CommerceLogistics AI

**End-to-end machine learning engineering portfolio** — smart product discovery, content-based recommendations, and transparent illustrative shipping quotes. Built independently for a technical portfolio; **not affiliated with any logistics company**.

> **Data integrity:** All included products, ratings, and shipping tariffs are **fictional demonstration data**. The default search system uses a trained TF-IDF vector model (not a transformer embedding model); optional multilingual sentence-transformer embeddings can be enabled. Shipping quotes are **rule-based illustrative simulations**, *not* learned predictions or commercial offers. No evaluation numbers are claimed without execution.

## Features

| Module | Endpoint | Method |
|---|---|---|
| Product discovery | \`GET /api/search?q=...\` | TF-IDF cosine similarity; optional multilingual embeddings |
| Catalogue | \`GET /api/products\` | Synthetic local dataset |
| Similar products | \`GET /api/recommendations/{id}\` | Content-based similarity with category weighting |
| Shipping simulator | \`POST /api/quote\` | Deterministic, volumetric-weight tariff simulator |
| Diagnostics | \`GET /api/health\` and \`GET /docs\` | Readiness and OpenAPI |

## Start with Docker

Requires Docker Compose.

\`\`\`bash
git clone https://github.com/heltrakinho07/CommerceLogistics.git
cd CommerceLogistics
docker compose up --build
\`\`\`

Open **http://localhost:5173** for the dashboard, or **http://localhost:8000/docs** for interactive API documentation.

### Manual development

\`\`\`bash
python -m venv .venv
# Linux/macOS: source .venv/bin/activate
# Windows: .venv\Scripts\activate
pip install -r services/api/requirements.txt
pip install -r services/api/requirements-dev.txt
PYTHONPATH=services/api uvicorn app.main:app --reload
\`\`\`

In a second terminal:

\`\`\`bash
cd apps/web
npm install
npm run dev
\`\`\`

On Windows PowerShell, set \`$env:PYTHONPATH="services/api"\` before starting Uvicorn.

## API examples

\`\`\`bash
curl "http://localhost:8000/api/search?q=portatil%20para%20programacao&limit=5"
curl "http://localhost:8000/api/recommendations/p001?limit=4"
curl -X POST http://localhost:8000/api/quote -H "Content-Type: application/json" -d '{"origin":"Lisboa","destination":"Maputo","weight_kg":2,"length_cm":30,"width_cm":20,"height_cm":15,"service":"standard","declared_value_mzn":5000}'
\`\`\`

## Model transparency

- **Search baseline (ready by default):** scikit-learn word (1–2 gram) and character (3–5 gram) TF-IDF trained on the in-repo toy catalogue. Queries are optionally expanded with a small Portuguese/Mozambican glossary. This is lexical retrieval rather than contextual sentence understanding.
- **Optional semantic embeddings:** \`pip install -r services/api/requirements-embeddings.txt\` and \`SEARCH_BACKEND=sentence-transformers\`. Uses \`sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2\`, downloaded on first use. This requires connectivity, extra CPU/RAM, and model licensing review for use beyond the demo.
- **Recommendations:** content-based product similarity, with a deterministic same-category boost. No customer purchase history is included: this is **not collaborative filtering**.
- **Price quotes:** fixed demo origin/destination rates, volumetric weight, optional express multiplier and coverage charge. It is **not ML-based cost prediction**.

### Evaluation (no invented results)

\`\`\`bash
PYTHONPATH=services/api python ml/evaluate_search.py
PYTHONPATH=services/api pytest -q services/api/tests
\`\`\`

The search benchmark uses a *small manually labelled demo set* in \`data/sample/search_queries.json\`; it reports Precision@5, Recall@5 and nDCG@5 for the baseline and **must not be interpreted as a production accuracy estimate**. Replace toy data with licensed ESCI (and labelled local-language queries) for a meaningful benchmark, and use the Olist dataset to train a separate freight model after cleaning, leakage checks and jurisdiction-specific calibration.

## Project structure

\`\`\`text
apps/web/                React + TypeScript + Vite dashboard
services/api/app/        FastAPI contracts, ML retrieval, catalog, quote logic
services/api/tests/      Integration and validation tests
data/sample/             Clearly-labelled synthetic product and label fixtures
ml/evaluate_search.py    Reproducible precision/recall/nDCG benchmark
.github/workflows/ci.yml  Python tests + frontend production build
docker-compose.yml       Web and API
\`\`\`

## Roadmap

1. Ingest licensed Amazon ESCI labels and compare BM25 / TF-IDF / multilingual embeddings.
2. Add PostgreSQL + pgvector for persistent ANN retrieval, pagination, and relevance logging.
3. Train a proper shipping estimator only on representative, authorised transactional freight data.
4. Add privacy-safe events and offline evaluation for recommendation strategies.
5. Add model registry, experiment tracking, latency budgets and production observability.

**Language:** Portuguese (Mozambique); prices displayed in MZN, all demo-only.

MIT-licensed source code; third-party training corpora and models retain their own terms.
