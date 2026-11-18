import { expect, test } from '@playwright/test'

test('alta, completar y borrar un todo contra la API real', async ({ page }) => {
  const title = `e2e ${Date.now()}`
  await page.goto('/')

  await page.getByPlaceholder('Nueva tarea').fill(title)
  await page.getByRole('button', { name: 'Agregar' }).click()
  const item = page.getByRole('listitem').filter({ hasText: title })
  await expect(item).toBeVisible()

  // Esperar la respuesta del PATCH antes del reload: sin esto, el reload le gana al request y el test es flaky.
  const patched = page.waitForResponse((r) => r.request().method() === 'PATCH' && r.ok())
  await item.getByRole('checkbox').check()
  await patched
  await page.reload()   // si sobrevive al reload, lo guardó la API y no el estado del componente
  await expect(page.getByRole('listitem').filter({ hasText: title }).getByRole('checkbox')).toBeChecked()

  await page.getByRole('listitem').filter({ hasText: title }).getByRole('button', { name: 'Borrar' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: title })).toHaveCount(0)
})

test('el server rechaza un título vacío y la UI no agrega nada', async ({ page, request }) => {
  const res = await request.post('http://localhost:5101/api/todos', { data: { title: '' } })
  expect(res.status()).toBe(400)
  expect(res.headers()['content-type']).toContain('application/problem+json')

  await page.goto('/')
  const before = await page.getByRole('listitem').count()
  await page.getByRole('button', { name: 'Agregar' }).click()   // el form corta en el cliente con título vacío
  await expect(page.getByRole('listitem')).toHaveCount(before)
})
