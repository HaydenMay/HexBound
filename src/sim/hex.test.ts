import { describe, expect, it } from 'vitest'
import { hexDistance, hexToWorld, neighbors, sameHex, worldToHex } from './hex'

describe('hex math', () => {
  it('has every neighbor at distance 1', () => {
    for (let row = 0; row < 12; row++) {
      for (let col = 0; col < 12; col++) {
        const c = { col, row }
        for (const n of neighbors(c)) {
          expect(hexDistance(c, n)).toBe(1)
          expect(hexDistance(n, c)).toBe(1)
        }
      }
    }
  })

  it('produces six unique neighbors', () => {
    const c = { col: 3, row: 4 }
    const ns = neighbors(c)
    expect(ns.length).toBe(6)
    const keys = new Set(ns.map(n => `${n.col},${n.row}`))
    expect(keys.size).toBe(6)
  })

  it('knows known distances', () => {
    expect(hexDistance({ col: 0, row: 0 }, { col: 1, row: 0 })).toBe(1)
    expect(hexDistance({ col: 0, row: 0 }, { col: 0, row: 1 })).toBe(1)
    expect(hexDistance({ col: 0, row: 0 }, { col: 2, row: 1 })).toBe(3)
    expect(hexDistance({ col: 0, row: 0 }, { col: 5, row: 5 })).toBe(hexDistance({ col: 5, row: 5 }, { col: 0, row: 0 }))
  })

  it('round-trips hex to world and back', () => {
    for (let row = 0; row < 18; row++) {
      for (let col = 0; col < 26; col++) {
        const c = { col, row }
        const w = hexToWorld(c)
        const back = worldToHex(w.x, w.z)
        expect(sameHex(c, back)).toBe(true)
      }
    }
  })
})
