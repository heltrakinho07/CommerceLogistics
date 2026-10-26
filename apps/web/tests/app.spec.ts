import { expect, test } from '@playwright/test'

test('catálogo carregado pela API e pesquisa inteligente', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Encontra mais/ })).toBeVisible()
  await expect(page.locator('.product-card')).toHaveCount(18)
  await expect(page.locator('.stat-card').first()).toContainText('18')
  await page.getByRole('textbox', { name: 'Pesquisar produtos' }).fill('portátil para programação')
  await page.getByRole('button', { name: /Pesquisar com IA/ }).click()
  await expect(page.locator('.search-feedback')).toContainText('portátil para programação')
  await expect(page.locator('.search-feedback')).toContainText('tfidf')
  await expect(page.locator('.product-card').first()).toContainText('Laptop')

  const firstProduct = await page.locator('.product-card').first().locator('h3').innerText()
  await page.locator('.product-card').first().getByRole('button', { name: /Ver semelhantes/ }).click()
  await expect(page.getByRole('heading', { name: 'Produtos que combinam.' })).toBeVisible()
  await expect(page.locator('.selected-product')).toContainText(firstProduct)
  await expect(page.locator('.product-card')).toHaveCount(6)
  await expect(page.locator('.product-grid')).not.toContainText('Nenhum produto encontrado')
})

test('filtro de categorias e detalhe do produto', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.product-card')).toHaveCount(18)
  await page.getByRole('button', { name: 'Telemóveis', exact: true }).click()
  await expect(page.locator('.product-card')).toHaveCount(3)
  await page.locator('.product-card').first().getByRole('button', { name: /Comparar detalhes/ }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog')).toContainText('valor fictício')
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('cotação volumétrica passa pelo frontend, API e mostra discriminação', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Simular entrega/ }).click()
  await expect(page.getByRole('heading', { name: 'Calcula antes de enviar.' })).toBeVisible()
  await page.getByLabel('Peso real (kg)').fill('1')
  await page.getByLabel('Comprimento (cm)').fill('50')
  await page.getByLabel('Largura (cm)').fill('40')
  await page.getByLabel('Altura (cm)').fill('30')
  await page.getByLabel('Valor declarado (MZN)').fill('1000')
  // Browser constraint validation must accept 1 kg and permit submit.
  expect(await page.getByLabel('Peso real (kg)').evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(true)
  await page.getByRole('button', { name: /Calcular cotação demonstrativa/ }).click()
  await expect(page.locator('.quote-total')).toContainText('695')
  await expect(page.locator('.breakdown')).toContainText('12 kg')
  await expect(page.getByRole('region', { name: 'Previsão de Machine Learning' })).toContainText('Custo estimado pelo modelo')
  await expect(page.locator('.ml-prediction')).toContainText('dados 100% sintéticos')
  await expect(page.locator('.model-performance')).toContainText('MAE')
  await expect(page.locator('.model-performance')).toContainText('RMSE')
  await expect(page.locator('.model-performance')).toContainText('R²')
  await expect(page.locator('.quote-result')).toContainText('Cálculo de referência por regras')
  await page.getByRole('button', { name: /Express/ }).click()
  await page.getByRole('button', { name: /Calcular cotação demonstrativa/ }).click()
  await expect(page.locator('.quote-total')).not.toContainText('7 695 MT')
  await expect(page.locator('.quote-result')).toContainText('Suplemento expresso')
})

test('validação de rota inválida não cria cotação falsa', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Simular entrega/ }).click()
  await page.getByLabel('Origem').selectOption('Maputo')
  await page.getByLabel('Destino').selectOption('Maputo')
  await page.getByRole('button', { name: /Calcular cotação demonstrativa/ }).click()
  await expect(page.getByRole('alert')).toContainText('Origin and destination must differ')
  await expect(page.locator('.quote-total')).toHaveCount(0)
})

test('navegação em smartphone sem overflow horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('.product-card')).toHaveCount(18)
  await page.getByRole('button', { name: 'Abrir menu' }).click()
  await expect(page.locator('.sidebar')).toHaveClass(/sidebar-open/)
  await page.getByRole('button', { name: /Modelos & tecnologia/ }).click()
  await expect(page.getByRole('heading', { name: 'Transparência em cada modelo.' })).toBeVisible()
  await expect(page.locator('.sidebar')).not.toHaveClass(/sidebar-open/)
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1)
})
