"""Toy offline ranking benchmark. Labels and corpus are DEMONSTRATIVE, not production validation."""
import json
import math
from pathlib import Path

from app.ml import SearchIndex
from app.catalog import get_catalog

ROOT = Path(__file__).resolve().parents[1]
QUERIES = ROOT / "data" / "sample" / "search_queries.json"


def metrics_at_k(ranked: list[str], relevant: set[str], k: int = 5) -> dict[str, float]:
    top = ranked[:k]
    hits = sum(pid in relevant for pid in top)
    precision = hits / k
    recall = hits / len(relevant) if relevant else 0.0
    dcg = sum((1.0 / math.log2(i + 2)) for i, pid in enumerate(top) if pid in relevant)
    ideal = sum(1.0 / math.log2(i + 2) for i in range(min(k, len(relevant))))
    return {"precision": precision, "recall": recall, "ndcg": dcg / ideal if ideal else 0.0}


def run_benchmark():
    index = SearchIndex(get_catalog(), backend="tfidf")
    labels = json.loads(QUERIES.read_text(encoding="utf-8"))
    measured = []
    for case in labels:
        ranked = [hit["product"].id for hit in index.search(case["query"], limit=5)]
        scores = metrics_at_k(ranked, set(case["relevant_ids"]), k=5)
        measured.append(scores)
        print(f"{case['query']:<35} P@5={scores['precision']:.3f} R@5={scores['recall']:.3f} nDCG@5={scores['ndcg']:.3f}")
    print("\nToy fixture means — never interpret as production performance:")
    for key in ("precision", "recall", "ndcg"):
        print(f"{key}@5: {sum(row[key] for row in measured)/len(measured):.4f}")


if __name__ == "__main__":
    run_benchmark()
