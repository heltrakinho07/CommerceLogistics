import type {
  HealthResponse, Hit, Product, QuoteRequest, QuoteResponse,
  RecommendationResponse, SearchResponse
} from './types'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, options)
  } catch {
    throw new Error('Não foi possível ligar à API. Confirma que o serviço FastAPI está activo.')
  }
  if (!response.ok) {
    let details = ''
    try {
      const payload: { detail?: string | { msg: string }[] } = await response.json()
      if (typeof payload.detail === 'string') details = payload.detail
      else if (Array.isArray(payload.detail)) details = payload.detail.map(e => e.msg).join('; ')
    } catch { /* Non-JSON HTTP error: status still visible */ }
    throw new Error(details || 'Erro da API (HTTP ' + response.status + ').')
  }
  return response.json() as Promise<T>
}

export const api = {
  health: () => request<HealthResponse>('/api/health'),
  products: () => request<Product[]>('/api/products?limit=100'),
  categories: () => request<string[]>('/api/categories'),
  search: (query: string, category?: string) => {
    const params = new URLSearchParams({ q: query, limit: '24' })
    if (category) params.set('category', category)
    return request<SearchResponse>('/api/search?' + params.toString())
  },
  recommend: (id: string) => request<RecommendationResponse>(
    '/api/recommendations/' + encodeURIComponent(id) + '?limit=6'
  ),
  quote: (payload: QuoteRequest) => request<QuoteResponse>('/api/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }),
}

export type ProductHit = Hit
