import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowLeft, ArrowRight, ArrowUpRight, BarChart3,
  Box, BrainCircuit, Check, CircleHelp, Code2, Cpu,
  Database, ExternalLink, Headphones, Laptop,
  Layers3, LoaderCircle, MapPin, Menu, Package,
  PackageCheck, PackageSearch, Search, ShieldCheck, ShoppingBag,
  SlidersHorizontal, Smartphone, Sparkles, Star, Tag, Tablet, Truck,
  WandSparkles, Watch, X
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { api } from './api'
import type { FreightModelMetrics, FreightPrediction, HealthResponse, Product, QuoteRequest, QuoteResponse } from './types'

type Tab = 'discover' | 'recommend' | 'shipping' | 'architecture'
type ViewProduct = { product: Product; score?: number }

const currency = (value: number) =>
  new Intl.NumberFormat('pt-MZ', { maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(value) + ' MT'

const categoryIcons: Record<string, LucideIcon> = {
  Computadores: Laptop, Telemóveis: Smartphone, Áudio: Headphones,
  Acessórios: Package, Wearables: Watch, Tablets: Tablet,
}

const categoryStyles: Record<string, string> = {
  Computadores: 'computer', Telemóveis: 'mobile', Áudio: 'audio',
  Acessórios: 'accessory', Wearables: 'wearable', Tablets: 'tablet',
}

const menu: { id: Tab; label: string; subtitle: string; icon: LucideIcon }[] = [
  { id: 'discover', label: 'Explorar produtos', subtitle: 'Pesquisa inteligente', icon: PackageSearch },
  { id: 'recommend', label: 'Recomendações', subtitle: 'Itens relacionados', icon: WandSparkles },
  { id: 'shipping', label: 'Simular entrega', subtitle: 'Estimativa de frete', icon: Truck },
  { id: 'architecture', label: 'Modelos & tecnologia', subtitle: 'Como funciona', icon: BrainCircuit },
]

const initialQuote: QuoteRequest = {
  origin: 'Lisboa', destination: 'Maputo', weight_kg: 2,
  length_cm: 35, width_cm: 25, height_cm: 20,
  service: 'standard', declared_value_mzn: 0,
}

function Artwork({ product, large = false }: { product: Product; large?: boolean }) {
  const Icon = categoryIcons[product.category] || Box
  return (
    <div className={'product-art art-' + (categoryStyles[product.category] || 'accessory') + (large ? ' art-large' : '')}>
      <div className="art-orbit orbit-one" />
      <div className="art-orbit orbit-two" />
      <Icon className="art-icon" strokeWidth={1.25} />
      <span className="art-shimmer" />
    </div>
  )
}

function ProductCard({ item, onRelated, onCompare }: {
  item: ViewProduct
  onRelated: (product: Product) => void
  onCompare: (product: Product) => void
}) {
  const { product, score } = item
  return (
    <article className="product-card">
      <div className="product-visual">
        <Artwork product={product} />
        <span className="visual-flag"><Sparkles size={12} /> Demo</span>
        <button className="heart-btn" type="button" title="Comparar detalhes" onClick={() => onCompare(product)}><ArrowUpRight size={17} /></button>
      </div>
      <div className="product-body">
        <div className="product-meta">
          <span>{product.category}</span>
          <span className="rating"><Star size={13} fill="currentColor" /> {product.rating.toFixed(1)} <span className="muted-inline">demo</span></span>
        </div>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div className="product-bottom">
          <div><span className="price-note">Valor fictício</span><div className="product-price">{currency(product.price_mzn)}</div></div>
          <button className="icon-button" type="button" aria-label={'Ver semelhantes a ' + product.name} onClick={() => onRelated(product)}><ArrowRight size={19} /></button>
        </div>
        {score !== undefined && <div className="relevance"><span>Relevância do modelo</span><strong>{Math.round(score * 100)}%</strong></div>}
      </div>
    </article>
  )
}

function Architecture() {
  const cards = [
    { icon: Search, number: '01', title: 'Pesquisa inteligente', label: 'ML · Modelo treinado', body: 'TF-IDF de palavras e caracteres com similaridade do cosseno. Embeddings multilingues opcionais, activados explicitamente.', tags: ['scikit-learn', 'NLP', 'Ranked retrieval'] },
    { icon: Layers3, number: '02', title: 'Recomendação por conteúdo', label: 'ML · Similaridade', body: 'Comparação vectorial entre produtos, com reforço determinístico de categoria. Não utiliza histórico real de compradores.', tags: ['Content-based', 'Cosine similarity', 'Cold start'] },
    { icon: Truck, number: '03', title: 'Previsão de frete e entrega', label: 'ML · Regressão em dados sintéticos', body: 'Ridge, Random Forest e Gradient Boosting comparados em validação; avaliação num teste separado. Sem registos de transportadoras reais.', tags: ['MAE / RMSE / R²', 'Holdout test', 'Synthetic only'] },
  ]
  return (
    <div className="architecture-page">
      <div className="page-heading"><div><div className="eyebrow"><Cpu size={14} /> ENGENHARIA DE ML</div><h1>Transparência em cada modelo.</h1><p>Um portefólio técnico onde os dados, os métodos e as limitações são explícitos.</p></div></div>
      <div className="architecture-grid">
        {cards.map(card => <article className="arch-card" key={card.number}>
          <div className="arch-top"><span className="arch-icon"><card.icon size={23} /></span><span className="arch-number">{card.number}</span></div>
          <span className="arch-label">{card.label}</span><h2>{card.title}</h2><p>{card.body}</p>
          <div className="tag-list">{card.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
        </article>)}
      </div>
      <div className="principle-grid">
        <div className="info-panel"><Database size={24} /><h3>Proveniência de dados</h3><p>Os produtos, as classificações e os exemplos de transporte são sintéticos. Mesmo as métricas de regressão medem apenas a simulação, não o mercado real.</p></div>
        <div className="info-panel"><BarChart3 size={24} /><h3>Avaliação reproduzível</h3><p>O repositório apresenta Precision@5 / Recall@5 / nDCG@5 para pesquisa e MAE / RMSE / R² em conjuntos separados de treino, validação e teste para frete.</p></div>
        <div className="info-panel"><Code2 size={24} /><h3>Implementação end-to-end</h3><p>FastAPI, React, TypeScript, scikit-learn, Docker, validação de pedidos e testes de integração no GitHub Actions.</p></div>
      </div>
      <div className="next-steps">
        <div><span className="eyebrow">PRÓXIMA ITERAÇÃO</span><h2>De demonstração a produção</h2><p>Integração com datasets licenciados, benchmark independente, Postgres/pgvector, observabilidade e substituição dos dados sintéticos por registos autorizados de frete.</p></div>
        <a className="dark-link" target="_blank" rel="noreferrer" href="https://github.com/heltrakinho07/CommerceLogistics"><ExternalLink size={16} /> Explorar código no GitHub</a>
      </div>
    </div>
  )
}

function Shipping({ onError }: { onError: (message: string) => void }) {
  const [form, setForm] = useState<QuoteRequest>(initialQuote)
  const [result, setResult] = useState<QuoteResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [prediction, setPrediction] = useState<FreightPrediction | null>(null)
  const [modelMetrics, setModelMetrics] = useState<FreightModelMetrics | null>(null)
  const [mlIssue, setMlIssue] = useState('')
  useEffect(() => { api.modelMetrics().then(setModelMetrics).catch(() => setModelMetrics(null)) }, [])
  const updateNumber = (key: 'weight_kg' | 'length_cm' | 'width_cm' | 'height_cm' | 'declared_value_mzn', value: string) => {
    setForm(previous => ({ ...previous, [key]: Number(value) }))
    setResult(null); setPrediction(null); setMlIssue('')
  }
  async function calculate() {
    setBusy(true); onError('')
    try {
      const [rules, ml] = await Promise.allSettled([api.quote(form), api.predictQuote(form)])
      if (rules.status === 'fulfilled') setResult(rules.value)
      if (ml.status === 'fulfilled') setPrediction(ml.value)
      else setMlIssue(ml.reason instanceof Error ? ml.reason.message : 'Modelo experimental indisponível.')
      if (rules.status === 'rejected') {
        onError(rules.reason instanceof Error ? rules.reason.message : 'Falha ao calcular a simulação.')
      }
    } finally { setBusy(false) }
  }
  return (
    <div className="shipping-page">
      <div className="page-heading"><div><div className="eyebrow"><Truck size={15} /> SIMULADOR LOGÍSTICO</div><h1>Calcula antes de enviar.</h1><p>Compara a previsão de ML treinada em dados sintéticos com o motor de regras. Nenhum valor é comercial.</p></div><div className="heading-symbol"><Truck size={30} /></div></div>
      <div className="shipping-layout">
        <form className="quote-form panel" onSubmit={e => { e.preventDefault(); void calculate() }}>
          <div className="section-title"><span className="section-icon"><MapPin size={20} /></span><div><h2>Origem e destino</h2><p>Selecciona a rota de demonstração</p></div></div>
          <div className="field-grid">
            <label>Origem<select value={form.origin} onChange={e => { setForm({ ...form, origin: e.target.value as QuoteRequest['origin'] }); setResult(null); setPrediction(null); setMlIssue('') }}><option>Lisboa</option><option>Maputo</option><option>Beira</option><option>Nampula</option></select></label>
            <label>Destino<select value={form.destination} onChange={e => { setForm({ ...form, destination: e.target.value as QuoteRequest['destination'] }); setResult(null); setPrediction(null); setMlIssue('') }}><option>Maputo</option><option>Matola</option><option>Beira</option><option>Nampula</option><option>Pemba</option></select></label>
          </div>
          <div className="section-title section-spaced"><span className="section-icon"><Box size={20} /></span><div><h2>Dados da encomenda</h2><p>O peso volumétrico também afecta o custo</p></div></div>
          <div className="field-grid">
            <label>Peso real (kg)<input type="number" required min="0.01" max="1000" step="0.01" value={form.weight_kg} onChange={e => updateNumber('weight_kg', e.target.value)} /></label>
            <label>Valor declarado (MZN)<input type="number" min="0" max="10000000" step="1" value={form.declared_value_mzn} onChange={e => updateNumber('declared_value_mzn', e.target.value)} /></label>
          </div>
          <div className="field-grid triple">
            <label>Comprimento (cm)<input required type="number" min="1" max="400" step="1" value={form.length_cm} onChange={e => updateNumber('length_cm', e.target.value)} /></label>
            <label>Largura (cm)<input required type="number" min="1" max="400" step="1" value={form.width_cm} onChange={e => updateNumber('width_cm', e.target.value)} /></label>
            <label>Altura (cm)<input required type="number" min="1" max="400" step="1" value={form.height_cm} onChange={e => updateNumber('height_cm', e.target.value)} /></label>
          </div>
          <div className="section-title section-spaced"><span className="section-icon"><PackageCheck size={20} /></span><div><h2>Modalidade</h2><p>Escolhe o nível de serviço</p></div></div>
          <div className="service-choices">
            <button type="button" className={'service-option ' + (form.service === 'standard' ? 'chosen' : '')} onClick={() => { setForm({ ...form, service: 'standard' }); setResult(null); setPrediction(null); setMlIssue('') }}><Package size={22} /><strong>Standard</strong><span>Envio económico</span>{form.service === 'standard' && <Check className="choice-check" size={16} />}</button>
            <button type="button" className={'service-option ' + (form.service === 'express' ? 'chosen' : '')} onClick={() => { setForm({ ...form, service: 'express' }); setResult(null); setPrediction(null); setMlIssue('') }}><Truck size={22} /><strong>Express</strong><span>Prazo reduzido</span>{form.service === 'express' && <Check className="choice-check" size={16} />}</button>
          </div>
          <button className="primary-button full" disabled={busy} type="submit">{busy ? <LoaderCircle className="spin" size={17} /> : <ArrowUpRight size={18} />} Calcular cotação demonstrativa</button>
          <p className="form-footnote"><ShieldCheck size={15} /> Nenhum pedido é efectuado; trata-se apenas de uma simulação.</p>
        </form>
        <div className="quote-result panel">
          <div className="result-header"><span className="eyebrow">COMPARAÇÃO DE ESTIMATIVAS</span><span className="demo-badge"><Check size={13} /> Demo</span></div>
          {prediction && <section className="ml-prediction" aria-label="Previsão de Machine Learning">
            <div className="ml-prediction-heading"><BrainCircuit size={19} /><span>Previsão de Machine Learning</span></div>
            <p className="ml-prediction-subtitle">Regressão supervisionada · dados 100% sintéticos · valores fictícios</p>
            <div className="ml-prediction-primary"><span>Custo estimado pelo modelo</span><strong>{currency(prediction.predicted_cost_mzn)}</strong></div>
            <div className="ml-prediction-eta"><Truck size={16} /> Prazo previsto: {prediction.predicted_days} dias (faixa ilustrativa {prediction.estimated_days_min}–{prediction.estimated_days_max})</div>
            {!prediction.in_training_domain && <p className="ml-caveat">Atenção: valores fora da distribuição usada no treino sintético. A previsão pode ser pouco estável.</p>}
            {modelMetrics && <div className="model-performance">
              <div className="model-performance-header"><BarChart3 size={16} /> Avaliação em dados sintéticos não usados no treino</div>
              <div className="model-performance-row"><span>Custo · {modelMetrics.metrics.cost_mzn.selected_model.replaceAll('_', ' ')}</span><strong>MAE {currency(modelMetrics.metrics.cost_mzn.holdout_test.mae)}</strong></div>
              <div className="model-performance-row"><span>RMSE do custo</span><strong>{currency(modelMetrics.metrics.cost_mzn.holdout_test.rmse)}</strong></div>
              <div className="model-performance-row"><span>R² do custo</span><strong>{modelMetrics.metrics.cost_mzn.holdout_test.r2.toFixed(3)}</strong></div>
              <div className="model-performance-row"><span>Prazo · {modelMetrics.metrics.delivery_days.selected_model.replaceAll('_', ' ')}</span><strong>MAE {modelMetrics.metrics.delivery_days.holdout_test.mae.toFixed(2)} dias</strong></div>
              <p className="model-performance-footnote">Teste: {modelMetrics.test_samples} encomendas geradas. Estas métricas não demonstram precisão com entregas reais em Moçambique.</p>
            </div>}
            <p className="ml-caveat">{prediction.disclaimer}</p>
          </section>}
          {mlIssue && <p className="ml-caveat" role="status">Previsão ML indisponível: {mlIssue}. A cotação por regras continua disponível.</p>}
          {result ? <>
            <div className="quote-total-label">Referência por regras (fictícia)</div>
            <div className="quote-total">{currency(result.total_mzn)}</div>
            <div className="quote-eta"><Truck size={18} /> Prazo ilustrativo: {result.estimated_days_min}–{result.estimated_days_max} dias</div>
            <div className="result-divider" />
            <h3>Detalhes do cálculo</h3>
            <div className="breakdown">
              <div><span>Peso real</span><strong>{result.actual_weight_kg} kg</strong></div>
              <div><span>Peso volumétrico</span><strong>{result.volumetric_weight_kg} kg</strong></div>
              <div><span>Peso facturável</span><strong>{result.billed_weight_kg} kg</strong></div>
              <div><span>Taxa base</span><strong>{currency(result.base_fee_mzn)}</strong></div>
              <div><span>Transporte por peso</span><strong>{currency(result.weight_fee_mzn)}</strong></div>
              <div><span>Suplemento expresso</span><strong>{currency(result.express_surcharge_mzn)}</strong></div>
              <div><span>Cobertura ilustrativa</span><strong>{currency(result.coverage_fee_mzn)}</strong></div>
            </div>
            <div className="result-disclaimer"><CircleHelp size={17} /><p>{result.disclaimer} Cálculo de referência por regras, independente do modelo ML.</p></div>
          </> : <div className="result-empty"><div className="result-art"><Truck size={58} strokeWidth={1.2} /><span className="result-art-ring" /></div><h2>Uma estimativa clara, sem surpresas.</h2><p>Preenche os dados e calcula uma cotação para veres o desdobramento completo do valor.</p><div className="result-promise"><Check size={16} /> Regressão experimental e comparação por regras</div></div>}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>('discover')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [category, setCategory] = useState('')
  const [found, setFound] = useState<ViewProduct[] | null>(null)
  const [method, setMethod] = useState('')
  const [recommendations, setRecommendations] = useState<ViewProduct[]>([])
  const [source, setSource] = useState<Product | null>(null)
  const [comparison, setComparison] = useState<Product | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.products(), api.categories(), api.health()])
      .then(([catalog, cats, status]) => { setProducts(catalog); setCategories(cats); setHealth(status) })
      .catch(e => setError(e instanceof Error ? e.message : 'Erro ao carregar os dados.'))
      .finally(() => setLoading(false))
  }, [])

  async function searchProducts() {
    if (query.trim().length < 2) { setSubmitted(''); setFound(null); setError(''); return }
    setError(''); setBusy(true)
    try {
      const result = await api.search(query.trim())
      setSubmitted(result.query); setFound(result.results); setMethod(result.method)
    } catch (e) { setError(e instanceof Error ? e.message : 'A pesquisa falhou.') }
    finally { setBusy(false) }
  }

  async function showRelated(product: Product) {
    setTab('recommend'); setMobileMenu(false); setSource(product); setBusy(true); setError('')
    try { setRecommendations((await api.recommend(product.id)).results) }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível carregar as recomendações.') }
    finally { setBusy(false) }
  }

  function navigate(next: Tab) { setTab(next); setError(''); setMobileMenu(false) }
  const cards = useMemo<ViewProduct[]>(() =>
    (found || products.map(product => ({ product }))).filter(item => !category || item.product.category === category),
    [found, products, category]
  )
  const maxProducts = found ? cards.length : products.length

  return (
    <div className="app-shell">
      <aside className={'sidebar ' + (mobileMenu ? 'sidebar-open' : '')}>
        <div className="brand"><span className="brand-mark"><Box size={24} strokeWidth={2} /></span><span className="brand-name">commerce<span>logistics</span><small>AI INTELLIGENCE</small></span><button className="menu-close" type="button" onClick={() => setMobileMenu(false)}><X size={20} /></button></div>
        <div className="sidebar-divider" />
        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="side-nav">{menu.map(item => <button type="button" key={item.id} className={'nav-item ' + (tab === item.id ? 'nav-active' : '')} onClick={() => navigate(item.id)}><item.icon size={19} strokeWidth={1.9} /><span>{item.label}<small>{item.subtitle}</small></span>{tab === item.id && <span className="nav-indicator" />}</button>)}</nav>
        <div className="sidebar-bottom">
          <div className="sidebar-ai-card"><div className="side-ai-icon"><Sparkles size={19} /></div><span>Built with intelligence</span><strong>Machine Learning, aplicado ao comércio.</strong><p>Três módulos. Uma aplicação.</p><button type="button" onClick={() => navigate('architecture')}>Ver arquitectura <ArrowUpRight size={15} /></button></div>
          <div className="sidebar-footer"><span className="footer-status"><span /> {health ? 'API ligada' : 'API indisponível'}</span><span>PORTFOLIO · 2026</span></div>
        </div>
      </aside>
      {mobileMenu && <button type="button" className="mobile-overlay" aria-label="Fechar menu" onClick={() => setMobileMenu(false)} />}
      <div className="content-wrap">
        <header className="topbar">
          <div className="topbar-left"><button className="mobile-toggle" type="button" aria-label="Abrir menu" onClick={() => setMobileMenu(true)}><Menu size={23} /></button><span className="crumb">Workspace</span><span className="crumb-arrow">/</span><strong>{menu.find(x => x.id === tab)?.label}</strong></div>
          <div className="topbar-right"><span className="topbar-live"><span /> Demo environment</span><a className="topbar-github" href="https://github.com/heltrakinho07/CommerceLogistics" rel="noreferrer" target="_blank"><Code2 size={18} /><span>GitHub</span><ArrowUpRight size={14} /></a><span className="avatar">CL</span></div>
        </header>
        <main className="main-content">
          {error && <div role="alert" className="error-banner"><CircleHelp size={18} /> <span>{error}</span><button type="button" aria-label="Fechar aviso" onClick={() => setError('')}><X size={17} /></button></div>}
          {tab === 'discover' && <>
            <section className="hero"><div className="hero-content"><div className="hero-tag"><Sparkles size={15} /> INTELLIGENT COMMERCE PLATFORM</div><h1>Encontra mais.<br /><span>Descobre melhor.</span></h1><p>Pesquisa inteligente que liga pessoas aos produtos certos. Uma experiência alimentada por Machine Learning.</p><div className="hero-chips"><span><Check size={14} /> Pesquisa por relevância</span><span><Check size={14} /> Recomendações inteligentes</span></div></div><div className="hero-graphics" aria-hidden="true"><div className="hero-ring ring-a" /><div className="hero-ring ring-b" /><div className="hero-core"><ShoppingBag size={77} strokeWidth={1.1} /></div><div className="float-element float-one"><Sparkles size={20} /></div><div className="float-element float-two"><Activity size={18} /></div><div className="float-element float-three"><Package size={20} /></div></div></section>
            <div className="stats-grid">
              <div className="stat-card"><span className="stat-icon purple"><ShoppingBag size={19} /></span><div><span>Produtos de exemplo</span><strong>{health?.catalog_size ?? '—'}</strong></div><span className="stat-trend">Demo</span></div>
              <div className="stat-card"><span className="stat-icon teal"><Layers3 size={19} /></span><div><span>Categorias</span><strong>{categories.length || '—'}</strong></div><span className="stat-trend">Catálogo</span></div>
              <div className="stat-card"><span className="stat-icon orange"><BrainCircuit size={19} /></span><div><span>Motor de pesquisa</span><strong>{method === 'sentence-transformers' ? 'Embeddings' : 'TF-IDF'}</strong></div><span className="stat-trend">Modelo</span></div>
            </div>
            <section className="catalog-section">
              <div className="catalog-heading"><div><div className="eyebrow"><span className="dot-accent" /> CATÁLOGO DE DEMONSTRAÇÃO</div><h2>Explora o catálogo <span>inteligente.</span></h2><p>Produtos fictícios para demonstrar o motor de pesquisa e recomendação.</p></div><span className="catalog-count">{maxProducts} itens {submitted && '· pesquisa activa'}</span></div>
              <form className="searchbar" onSubmit={e => { e.preventDefault(); void searchProducts() }}><Search size={22} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Ex.: portátil para programação, telemóvel, auscultadores..." aria-label="Pesquisar produtos" /><button type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />} Pesquisar com IA</button></form>
              <div className="filters-row"><div className="filter-scroll"><button type="button" className={'filter-pill ' + (!category ? 'selected' : '')} onClick={() => setCategory('')}>Todos os produtos</button>{categories.map(cat => <button type="button" key={cat} className={'filter-pill ' + (category === cat ? 'selected' : '')} onClick={() => setCategory(cat)}>{cat}</button>)}</div><span className="sort-label"><SlidersHorizontal size={16} /> {submitted ? 'Por relevância' : 'Catálogo demo'}</span></div>
              {submitted && <div className="search-feedback"><span><Sparkles size={15} /> Resultados para <strong>“{submitted}”</strong> · {method}</span><button type="button" onClick={() => { setFound(null); setSubmitted(''); setQuery('') }}>Limpar pesquisa <X size={13} /></button></div>}
              {loading ? <div className="loading-state"><LoaderCircle className="spin" size={28} /> A carregar o catálogo...</div> : cards.length ? <div className="product-grid">{cards.map(item => <ProductCard key={item.product.id} item={item} onRelated={showRelated} onCompare={setComparison} />)}</div> : <div className="empty-state"><PackageSearch size={40} /><h3>Nenhum produto encontrado</h3><p>Experimenta outra expressão ou selecciona uma categoria diferente.</p></div>}
            </section>
          </>}
          {tab === 'recommend' && <section className="recommend-page">
            <div className="page-heading"><div><div className="eyebrow"><WandSparkles size={15} /> RECOMENDAÇÃO POR CONTEÚDO</div><h1>Produtos que combinam.</h1><p>Descobre artigos semelhantes com base no conteúdo e nas categorias do catálogo demonstrativo.</p></div><span className="heading-symbol"><Layers3 size={29} /></span></div>
            {source ? <><div className="selected-product"><Artwork product={source} /><div><span className="eyebrow">PRODUTO DE REFERÊNCIA</span><h3>{source.name}</h3><p>{source.category} · {currency(source.price_mzn)}</p></div><button type="button" className="secondary-button" onClick={() => navigate('discover')}><ArrowLeft size={16} /> Mudar produto</button></div><div className="related-header"><h2>Recomendações relacionadas</h2><span>{recommendations.length} resultados</span></div>{busy ? <div className="loading-state"><LoaderCircle className="spin" size={25} /> A comparar produtos...</div> : <div className="product-grid">{recommendations.map(item => <ProductCard key={item.product.id} item={item} onRelated={showRelated} onCompare={setComparison} />)}</div>}</> : <div className="recommend-empty"><span className="recommend-empty-icon"><WandSparkles size={36} /></span><h2>Encontra a próxima opção ideal.</h2><p>Selecciona um produto do catálogo para gerar recomendações baseadas na similaridade dos seus atributos.</p><button type="button" className="primary-button" onClick={() => navigate('discover')}><ShoppingBag size={17} /> Explorar produtos <ArrowRight size={17} /></button></div>}
          </section>}
          {tab === 'shipping' && <Shipping onError={setError} />}
          {tab === 'architecture' && <Architecture />}
          <footer className="main-footer"><span>CommerceLogistics AI <span className="footer-sep">·</span> Projecto de portefólio independente</span><span><ShieldCheck size={14} /> Dados e tarifas exclusivamente demonstrativos</span></footer>
        </main>
      </div>
      {comparison && <div className="modal-backdrop" role="presentation" onClick={() => setComparison(null)}><div className="detail-modal" role="dialog" aria-modal="true" aria-label={'Detalhes de ' + comparison.name} onClick={e => e.stopPropagation()}><button type="button" className="modal-close" onClick={() => setComparison(null)} aria-label="Fechar"><X size={21} /></button><Artwork product={comparison} large /><span className="eyebrow">{comparison.category} · DEMONSTRAÇÃO</span><h2>{comparison.name}</h2><p>{comparison.description}</p><div className="modal-tags">{comparison.tags.map(t => <span key={t}><Tag size={12} />{t}</span>)}</div><div className="modal-price">{currency(comparison.price_mzn)} <small>valor fictício</small></div><button type="button" className="primary-button full" onClick={() => { const p = comparison; setComparison(null); void showRelated(p) }}>Ver produtos semelhantes <ArrowRight size={16} /></button></div></div>}
    </div>
  )
}
