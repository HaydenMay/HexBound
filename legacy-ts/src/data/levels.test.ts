import { describe, expect, it } from 'vitest'
import { Game } from '../sim/game'
import { ENEMY_DEFS } from './enemies'
import { STRUCTURE_DEFS } from './structures'
import { applySize, FIELD_SIZES, LEVELS } from './levels'

describe('battleground sizes', () => {
  it('medium returns the canonical config untouched', () => {
    for (const lvl of LEVELS) {
      expect(applySize(lvl.config, 'medium')).toBe(lvl.config)
    }
  })

  it('small shrinks and large grows every campaign map', () => {
    for (const lvl of LEVELS) {
      const small = applySize(lvl.config, 'small')
      const large = applySize(lvl.config, 'large')
      expect(small.cols * small.rows).toBeLessThan(lvl.config.cols * lvl.config.rows)
      expect(large.cols * large.rows).toBeGreaterThan(lvl.config.cols * lvl.config.rows)
    }
  })

  it('keeps entrance and ritual on the midline and in bounds at every size', () => {
    for (const lvl of LEVELS) {
      for (const size of FIELD_SIZES) {
        const c = applySize(lvl.config, size)
        expect(c.cols).toBeGreaterThanOrEqual(9)
        expect(c.rows).toBeGreaterThanOrEqual(5)
        expect(c.entrance.col).toBe(0)
        expect(Math.floor(c.rows / 2)).toBe(c.entrance.row)
        expect(Math.floor(c.cols / 2)).toBe(c.ritual.col)
        expect(c.ritual.row).toBe(c.entrance.row)
        expect(c.entrance.row).toBeLessThan(c.rows)
        expect(c.ritual.col).toBeLessThan(c.cols)
      }
    }
  })

  it('every level stays solvable at every size', () => {
    for (const lvl of LEVELS) {
      for (const size of FIELD_SIZES) {
        const game = new Game(applySize(lvl.config, size), { enemies: ENEMY_DEFS, structures: STRUCTURE_DEFS })
        expect(game.field.reachable(game.grid.entrance), `${lvl.id} ${size}`).toBe(true)
        expect(game.field.reachable(game.grid.ritual), `${lvl.id} ${size} ritual`).toBe(true)
      }
    }
  })
})
