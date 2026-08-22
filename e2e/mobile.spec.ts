import { expect, test, type Page } from '@playwright/test'

interface GameHook {
  phase: string
  essence: number
  enemies: { cur: { col: number; row: number }; t: number; next: unknown }[]
  structures: unknown[]
  grid: { entrance: { col: number; row: number }; ritual: { col: number; row: number } }
  place: (defId: string, hex: { col: number; row: number }) => boolean
}

async function boot(page: Page): Promise<void> {
  await page.goto('/HexBound/')
  const menu = page.locator('#menu')
  if (await menu.isVisible()) {
    await page.locator('#level-list .level-btn:not(.locked)').first().tap()
  }
  await expect(menu).toBeHidden()
  await expect(page.locator('#game')).toBeVisible()
}

function hook(page: Page) {
  return {
    game: () => page.evaluate(() => (window as unknown as Record<string, GameHook>).__hexboundGame),
    renderer: () => page.evaluate(() => (window as unknown as Record<string, Record<string, unknown>>).__hexboundRenderer)
  }
}

test('boots with zero console or page errors and full HUD visible', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(`pageerror: ${String(e)}`))
  page.on('console', m => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })
  await boot(page)

  await expect(page.locator('#overlay')).toBeHidden()
  await expect(page.locator('#palette .card')).toHaveCount(9)
  await expect(page.locator('#startwave')).toBeInViewport()
  await expect(page.locator('#pause')).toBeInViewport()

  expect(errors, errors.join('\n')).toHaveLength(0)
})

test('palette is horizontally scrollable when cards overflow the screen', async ({ page }) => {
  await boot(page)
  const state = await page.evaluate(() => {
    const el = document.getElementById('palette')!
    return {
      overflowX: getComputedStyle(el).overflowX,
      touchAction: getComputedStyle(el).touchAction,
      scrollable: el.scrollWidth > el.clientWidth
    }
  })
  expect(state.overflowX).toBe('auto')
  expect(state.touchAction).toContain('pan-x')
  expect(state.scrollable).toBe(true)

  await page.evaluate(() => document.getElementById('palette')!.scrollBy({ left: 320 }))
  const scrolled = await page.evaluate(() => document.getElementById('palette')!.scrollLeft)
  expect(scrolled).toBeGreaterThan(0)
})

test('start wave button is reachable and spawns moving enemies', async ({ page }) => {
  await boot(page)
  const start = page.locator('#startwave')
  await start.scrollIntoViewIfNeeded()
  await start.tap()

  const h = hook(page)
  await expect
    .poll(async () => (await h.game())?.phase, { timeout: 5_000 })
    .toBe('active')
  await expect
    .poll(async () => (await h.game())?.enemies.length ?? 0, { timeout: 10_000 })
    .toBeGreaterThan(0)

  const snap1 = JSON.stringify(await h.game().then(g => g?.enemies.map(e => [e.cur.col, e.cur.row, e.t])))
  await page.waitForTimeout(1_200)
  const snap2 = JSON.stringify(await h.game().then(g => g?.enemies.map(e => [e.cur.col, e.cur.row, e.t])))
  expect(snap1.length).toBeGreaterThan(0)
  expect(snap2).not.toBe(snap1)
})

test('tapping a palette card then tapping the field places a structure', async ({ page }) => {
  await boot(page)
  await page.locator('#palette .card').first().tap()

  const h = hook(page)
  const g = await h.game()
  const r = await h.renderer()
  expect(g).toBeTruthy()
  expect(r).toBeTruthy()

  const found = await page.evaluate(() => {
    const g = (window as unknown as Record<string, GameHook>).__hexboundGame
    const r = (window as unknown as Record<string, { projectHexToScreen: (c: number, w: number) => { x: number; y: number; visible: boolean } }>).__hexboundRenderer
    for (let d = 1; d <= 4; d++) {
      for (const [dc, dr] of [
        [-d, 0],
        [d, 0],
        [0, -d],
        [0, d]
      ]) {
        const col = g!.grid.ritual.col + dc
        const row = g!.grid.ritual.row + dr
        const p = r.projectHexToScreen(col, row)
        if (p.visible) return { col, row, x: p.x, y: p.y }
      }
    }
    return null
  })
  expect(found).toBeTruthy()

  const box = await page.locator('#game').boundingBox()
  expect(box).toBeTruthy()
  await page.touchscreen.tap(box!.x + found!.x, box!.y + found!.y)

  await expect.poll(async () => (await h.game())?.structures.length ?? 0).toBe(1)
})
