"""Transparent illustrative price engine. No real carrier tariff or trained model."""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


Origin = Literal["Maputo", "Beira", "Nampula", "Lisboa"]
Destination = Literal["Maputo", "Matola", "Beira", "Nampula", "Pemba"]
Service = Literal["standard", "express"]


class QuoteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    origin: Origin
    destination: Destination
    weight_kg: float = Field(gt=0, le=1000)
    length_cm: float = Field(gt=0, le=400)
    width_cm: float = Field(gt=0, le=400)
    height_cm: float = Field(gt=0, le=400)
    service: Service = "standard"
    declared_value_mzn: float = Field(default=0, ge=0, le=10_000_000)

    @model_validator(mode="after")
    def check_route(self):
        if self.origin == self.destination:
            raise ValueError("Origin and destination must differ")
        return self


class QuoteResponse(BaseModel):
    currency: Literal["MZN"] = "MZN"
    actual_weight_kg: float
    volumetric_weight_kg: float
    billed_weight_kg: float
    base_fee_mzn: float
    weight_fee_mzn: float
    express_surcharge_mzn: float
    coverage_fee_mzn: float
    total_mzn: float
    estimated_days_min: int
    estimated_days_max: int
    method: Literal["illustrative_rules"] = "illustrative_rules"
    is_demo: Literal[True] = True
    disclaimer: str = "Cotação ilustrativa. Não corresponde a tarifas nem prazos comerciais reais."


def quote_shipping(payload: QuoteRequest) -> QuoteResponse:
    volumetric = (payload.length_cm * payload.width_cm * payload.height_cm) / 5000.0
    billed = max(payload.weight_kg, volumetric)
    international = payload.origin == "Lisboa"
    if international:
        base_fee, price_per_kg, days = 1800.0, 490.0, (8, 16)
    else:
        distant = payload.destination in {"Nampula", "Pemba"} or payload.origin == "Nampula"
        base_fee, price_per_kg, days = (450.0, 115.0, (3, 7)) if distant else (250.0, 75.0, (1, 4))
    weight_fee = round(billed * price_per_kg, 2)
    subtotal = base_fee + weight_fee
    surcharge = round(subtotal * 0.55, 2) if payload.service == "express" else 0.0
    coverage = round(payload.declared_value_mzn * 0.015, 2)
    return QuoteResponse(
        actual_weight_kg=round(payload.weight_kg, 2),
        volumetric_weight_kg=round(volumetric, 2),
        billed_weight_kg=round(billed, 2),
        base_fee_mzn=base_fee,
        weight_fee_mzn=weight_fee,
        express_surcharge_mzn=surcharge,
        coverage_fee_mzn=coverage,
        total_mzn=round(subtotal + surcharge + coverage, 2),
        estimated_days_min=max(1, days[0] - (2 if payload.service == "express" else 0)),
        estimated_days_max=max(2, days[1] - (3 if payload.service == "express" else 0)),
    )
