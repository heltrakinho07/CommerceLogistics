export interface Product {
  id: string
  name: string
  description: string
  category: string
  price_mzn: number
  rating: number
  popularity: number
  tags: string[]
}

export interface Hit {
  product: Product
  score: number
}

export interface SearchResponse {
  query: string
  method: string
  is_demo: boolean
  results: Hit[]
}

export interface RecommendationResponse {
  product_id: string
  method: string
  is_demo: boolean
  results: Hit[]
}

export interface HealthResponse {
  status: string
  catalog_size: number
  demo_data: boolean
}

export interface QuoteRequest {
  origin: 'Maputo' | 'Beira' | 'Nampula' | 'Lisboa'
  destination: 'Maputo' | 'Matola' | 'Beira' | 'Nampula' | 'Pemba'
  weight_kg: number
  length_cm: number
  width_cm: number
  height_cm: number
  service: 'standard' | 'express'
  declared_value_mzn: number
}

export interface QuoteResponse {
  currency: string
  actual_weight_kg: number
  volumetric_weight_kg: number
  billed_weight_kg: number
  base_fee_mzn: number
  weight_fee_mzn: number
  express_surcharge_mzn: number
  coverage_fee_mzn: number
  total_mzn: number
  estimated_days_min: number
  estimated_days_max: number
  method: string
  is_demo: boolean
  disclaimer: string
}
