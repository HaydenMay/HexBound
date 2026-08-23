import { describe, expect, it } from 'vitest'
import { BattlefieldGrid } from './grid'
import { FlowField } from './flowfield'

function makeGrid() {
  return new BattlefieldGrid({ cols: 7, rows: 5, entrance: { col: 0, row: 2 }, ritual: { col: 4, row: 2 } })
}

describe('flow field', () => {
  it('reaches every cell on an open grid', () => {
    const grid = makeGrid()
    const field = new FlowField(grid)
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        expect(field.reachable({ col, row })).toBe(true)
      }
    }
    expect(field.distanceAt(grid.entrance)).toBeGreaterThan(0)
    expect(field.distanceAt(grid.ritual)).toBe(0)
  })

  it('routes around a wall with a gap', () => {
    const grid = makeGrid()
    for (const row of [0, 1, 3, 4]) {
      grid.setStructure({ defId: 'test', hex: { col: 3, row }, blocksPath: true })
    }
    const field = new FlowField(grid)
    expect(field.reachable(grid.entrance)).toBe(true)
    expect(field.distanceAt({ col: 3, row: 2 })).toBeGreaterThan(0)
    expect(Number.isFinite(field.distanceAt(grid.entrance))).toBe(true)
  })

  it('detects a fully sealed entrance', () => {
    const grid = makeGrid()
    for (let row = 0; row < grid.rows; row++) {
      grid.setStructure({ defId: 'test', hex: { col: 3, row }, blocksPath: true })
    }
    const field = new FlowField(grid)
    expect(field.reachable(grid.entrance)).toBe(false)
  })

  it('nextStep always moves downhill', () => {
    const grid = makeGrid()
    grid.setStructure({ defId: 'test', hex: { col: 3, row: 0 }, blocksPath: true })
    grid.setStructure({ defId: 'test', hex: { col: 3, row: 1 }, blocksPath: true })
    grid.setStructure({ defId: 'test', hex: { col: 3, row: 3 }, blocksPath: true })
    const field = new FlowField(grid)
    let c = grid.entrance
    let steps = 0
    while (steps < 100) {
      const next = field.nextStep(c)
      if (!next) break
      expect(field.distanceAt(next)).toBeLessThan(field.distanceAt(c))
      c = next
      steps++
      if (c.col === grid.ritual.col && c.row === grid.ritual.row) break
    }
    expect(steps).toBeLessThan(100)
    expect(c.col).toBe(grid.ritual.col)
    expect(c.row).toBe(grid.ritual.row)
  })

  it('penalties raise cost without disconnecting', () => {
    const grid = makeGrid()
    for (let row = 0; row < grid.rows; row++) {
      grid.addPenalty({ col: 2, row }, 0, 8)
    }
    const field = new FlowField(grid)
    expect(field.reachable(grid.entrance)).toBe(true)

    const clean = new FlowField(new BattlefieldGrid({ cols: 7, rows: 5, entrance: { col: 0, row: 2 }, ritual: { col: 4, row: 2 } }))
    expect(field.distanceAt(grid.entrance)).toBeGreaterThanOrEqual(clean.distanceAt(grid.entrance))
  })
})
