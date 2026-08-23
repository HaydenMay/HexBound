import { expect, test } from '@playwright/test'

const SIZES = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 412, height: 915 }
]

test.skip(process.env.SHOTS !== '1', 'screenshot harness runs only with SHOTS=1')

for (const size of SIZES) {
  test(`battlefield shot ${size.name}`, async ({ page }) => {
    test.setTimeout(45_000)
    await page.setViewportSize({ width: size.width, height: size.height })
    await page.goto('/HexBound/')
    await page.locator('#level-list .level-btn:not(.locked)').first().click()
    await expect(page.locator('#menu')).toBeHidden()

    await page.evaluate(() => {
      const g = (window as unknown as Record<string, { canPlace: (id: string, h: { col: number; row: number }) => { ok: boolean }; place: (id: string, h: { col: number; row: number }) => boolean; startWave: () => void; essence: number }>).__hexboundGame
      g.essence = 999
      const showcase: [string, number, number][] = [
        ['spellmirror', 1, 2],
        ['hexcauldron', 3, 2],
        ['bonepalisade', 2, 4],
        ['thorngrove', 2, 1],
        ['stormtotem', 4, 4],
        ['mushroomring', 7, 2],
        ['whisperingidol', 7, 4],
        ['moonwell', 8, 2],
        ['watchingeye', 5, 3]
      ]
      for (const [id, col, row] of showcase) {
        if (g.canPlace(id, { col, row }).ok) g.place(id, { col, row })
      }
    })

    await page.locator('#startwave').click()
    await page.waitForTimeout(5_000)
    await page.screenshot({ path: `screenshots/battle-${size.name}.png` })
  })
}
