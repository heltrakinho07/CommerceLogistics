"""Small reproducible retrieval baseline with optional multilingual embeddings."""
import os
import re
from functools import lru_cache

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .catalog import Product, get_catalog

# Tiny domain glossary for demonstration; *not* an LLM or translator.
SYNONYMS = {
    "portatil": "laptop computador notebook",
    "portátil": "laptop computador notebook",
    "computador": "laptop pc notebook",
    "telemovel": "smartphone celular telefone",
    "telemóvel": "smartphone celular telefone",
    "auscultadores": "headphones fones audio",
    "barato": "economico acessivel",
    "programacao": "programar desenvolvimento software",
}


def expand_query(query: str) -> str:
    additions = [SYNONYMS[word] for word in re.findall(r"\w+", query.lower()) if word in SYNONYMS]
    return f"{query} {' '.join(additions)}".strip()


def document(product: Product) -> str:
    return " ".join([product.name, product.name, product.category, product.description, *product.tags])


class SearchIndex:
    def __init__(self, products: tuple[Product, ...], backend: str = "tfidf"):
        self.products = products
        self.backend = backend
        self.documents = [document(p) for p in products]
        if backend == "tfidf":
            self.word = TfidfVectorizer(strip_accents="unicode", ngram_range=(1, 2), sublinear_tf=True)
            self.chars = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), strip_accents="unicode")
            self.word_matrix = self.word.fit_transform(self.documents)
            self.char_matrix = self.chars.fit_transform(self.documents)
        elif backend == "sentence-transformers":
            try:
                from sentence_transformers import SentenceTransformer
            except ImportError as exc:
                raise RuntimeError("Install requirements-embeddings.txt for semantic search") from exc
            self.model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
            self.embeddings = self.model.encode(
                self.documents, convert_to_numpy=True, normalize_embeddings=True
            )
        else:
            raise ValueError("SEARCH_BACKEND must be 'tfidf' or 'sentence-transformers'")

    def scores(self, query: str) -> np.ndarray:
        if self.backend == "tfidf":
            expanded = expand_query(query)
            word_scores = cosine_similarity(self.word.transform([expanded]), self.word_matrix)[0]
            char_scores = cosine_similarity(self.chars.transform([expanded]), self.char_matrix)[0]
            return 0.75 * word_scores + 0.25 * char_scores
        vector = self.model.encode([query], convert_to_numpy=True, normalize_embeddings=True)
        return np.asarray(vector @ self.embeddings.T)[0]

    def search(self, query: str, limit: int = 6, category: str | None = None):
        scores = self.scores(query)
        ranked = sorted(range(len(self.products)), key=lambda i: (-float(scores[i]), self.products[i].id))
        hits = [
            {"product": self.products[i], "score": round(float(scores[i]), 4)}
            for i in ranked
            if (not category or self.products[i].category.lower() == category.lower())
            and scores[i] > 0
        ]
        return hits[:limit]

    def similar(self, product_id: str, limit: int = 4):
        source_index = next((i for i, p in enumerate(self.products) if p.id == product_id), None)
        if source_index is None:
            return None
        if self.backend == "tfidf":
            scores = 0.75 * cosine_similarity(
                self.word_matrix[source_index], self.word_matrix
            )[0] + 0.25 * cosine_similarity(
                self.char_matrix[source_index], self.char_matrix
            )[0]
        else:
            scores = self.embeddings @ self.embeddings[source_index]
        source = self.products[source_index]
        ranks = []
        for i, product in enumerate(self.products):
            if i == source_index:
                continue
            boosted = float(scores[i]) + (0.12 if product.category == source.category else 0)
            ranks.append((i, boosted))
        ranks.sort(key=lambda pair: (-pair[1], self.products[pair[0]].id))
        return [{"product": self.products[i], "score": round(score, 4)} for i, score in ranks[:limit]]


@lru_cache(maxsize=1)
def get_index() -> SearchIndex:
    return SearchIndex(get_catalog(), os.environ.get("SEARCH_BACKEND", "tfidf").strip().lower())
