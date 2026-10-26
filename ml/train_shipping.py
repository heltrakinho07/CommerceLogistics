"""Create the reproducible simulated ML freight artefact.

Run: PYTHONPATH=services/api python ml/train_shipping.py
"""
import json
from app.freight_ml import train_model

if __name__ == "__main__":
    print(json.dumps(train_model(), indent=2, ensure_ascii=False))
