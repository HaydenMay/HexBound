import { expect, test } from '@playwright/test'

test('desktop boots, places a tower, and runs a wave', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(String(e)))
  await page.goto('/HexBound/')

  await expect(page.locator('#palette .card')).toHaveCount(6)
  await expect(page.locator('#overlay')).toBeHidden()

  await page.locator('#palette .card').first().click()
  const canvas = page.locator('#game')
  const box = await canvas.boundingBox()
  await page.mouse.click(box!.x + box!.width * 0.35, box!.y + box!.height * 0.45)

  await expect
    .poll(async () =>
      page.evaluate(() => (window as unknown as Record<string, { structures: unknown[] }>).__hexboundGame?.structures.length ?? 0)
    )
    .toBe(1)

  await page.locator('#startwave').click()
  await expect
    .poll(async () =>
      page.evaluate(() => (window as unknown as Record<string, { phase: string }>).__hexboundGame?.phase)
    )
    .toBe('active')

  expect(errors).toHaveLength(0)
})

test('speed and pause controls respond', async ({ page }) => {
  await page.goto('/HexBound/')
  const speed = page.locator('#speed')
  await speed.click()
  await expect(speed).toHaveText('2x')
  await speed.click()
  await expect(speed).toHaveText('3x')

  const pause = page.locator('#pause')
  await pause.click()
  await expect(pause).toHaveText('Resume')
})
