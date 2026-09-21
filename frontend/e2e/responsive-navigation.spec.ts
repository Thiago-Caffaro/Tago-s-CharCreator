import { expect, test } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel(/Usuário/i).fill('e2e-admin')
  await page.getByLabel(/Senha/i).fill('e2e-password')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL('/')
}

test('login, navegação global e layout sem overflow', async ({ page }) => {
  await login(page)
  await expect(page.getByRole('heading', { name: 'Projetos' })).toBeVisible()
  await page.getByRole('link', { name: /Presets/ }).click()
  await expect(page).toHaveURL('/presets')
  await page.getByRole('link', { name: /Config/ }).click()
  await expect(page).toHaveURL('/settings')
  await page.locator('a[href="/account"]:visible').click()
  await expect(page).toHaveURL('/account')
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  expect(hasOverflow).toBeFalsy()
})

test('projeto expõe abas contextuais e imagem antes da geração', async ({ page }, testInfo) => {
  await login(page)
  await page.getByRole('button', { name: /Novo/ }).click()
  const uniqueName = `E2E ${testInfo.project.name} ${Date.now()}`
  await page.getByPlaceholder('ex: Minha Waifu').fill(uniqueName)
  await page.getByPlaceholder('ex: Aria').fill('Personagem E2E')
  await page.getByRole('button', { name: 'Criar', exact: true }).click()
  await expect(page).toHaveURL(/\/editor\/\d+$/)

  if (testInfo.project.name !== 'desktop') {
    await expect(page.getByRole('link', { name: /Contexto/ })).toBeVisible()
    await page.getByRole('link', { name: /Gerar/ }).click()
  }
  await expect(page.locator('p:visible', { hasText: 'Imagem do personagem' })).toBeVisible()
  await expect(page.locator('p:visible', { hasText: /não é enviada para a IA/i })).toBeVisible()
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
  await page.locator('section:visible input[type=file][accept*="image/png"]').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: png })
  await expect(page.locator('section:visible img[alt="Imagem do personagem"]')).toBeVisible()

  await page.locator('button:visible', { hasText: 'Gerar Card' }).click()
  await expect(page).toHaveURL(/\/generating\?job=\d+/)
  const jobUrl = page.url()
  await page.reload()
  await expect(page).toHaveURL(jobUrl)
  await expect(page.getByRole('heading', { name: 'Geração no servidor' })).toBeVisible()
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  expect(hasOverflow).toBeFalsy()
})

test('admin cria usuário e usuário comum não acessa o painel', async ({ page }, testInfo) => {
  await login(page)
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Administração' })).toBeVisible()
  const username = `user-${testInfo.project.name}-${Date.now()}`
  await page.getByPlaceholder('Novo usuário').fill(username)
  await page.getByPlaceholder('Senha inicial').fill('user-password')
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await expect(page.getByText(username, { exact: true })).toBeVisible()
  await page.goto('/account')
  await page.getByRole('button', { name: 'Sair' }).click()
  await page.getByLabel(/Usuário/i).fill(username)
  await page.getByLabel(/Senha/i).fill('user-password')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL('/')
  await page.goto('/admin')
  await expect(page).toHaveURL('/account')
  await expect(page.getByRole('heading', { name: 'Conta' })).toBeVisible()
})
