import { expect, test } from '@playwright/test'

const SIZES = [
  { name: 'mobile portrait', width: 412, height: 915 },
  { name: 'mobile landscape', width: 915, height: 412 },
  { name: 'desktop', width: 1280, height: 800 }
]

test('all tower cards are clickable at every media size', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(`pageerror: ${String(e)}`))
  await page.goto('/HexBound/')
  await page.locator('#level-list .level-btn:not(.locked)').first().click()
  await expect(page.locator('#menu')).toBeHidden()

  const cards = page.locator('#palette .card')
  await expect(cards).toHaveCount(9)

  for (const size of SIZES) {
    await page.setViewportSize({ width: size.width, height: size.height })
    for (let i = 0; i < 9; i++) {
      const card = cards.nth(i)
      await card.scrollIntoViewIfNeeded()
      await card.click()
      await expect(card).toHaveClass(/selected/, { timeout: 3_000 })
    }
  }

  expect(errors, errors.join('\n')).toHaveLength(0)
})
