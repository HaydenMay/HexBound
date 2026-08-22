import { beforeEach, describe, expect, it } from 'vitest'
import { Game, type LightningPayload } from './game'
import { ENEMY_DEFS } from '../data/enemies'
import { STRUCTURE_DEFS } from '../data/structures'
import type { GameConfig, WaveDef } from './types'

const DEFS = { enemies: ENEMY_DEFS, structures: STRUCTURE_DEFS }

function oneWave(wave: WaveDef, stability = 10): Game {
  const config: GameConfig = {
    cols: 7,
    rows: 5,
    entrance: { col: 0, row: 2 },
    ritual: { col: 4, row: 2 },
    waves: [wave],
    startEssence: 500,
    startStability: stability
  }
  return new Game(config, DEFS)
}

function step(game: Game, seconds: number): void {
  const dt = 1 / 30
  const ticks = Math.round(seconds / dt)
  for (let i = 0; i < ticks; i++) {
    game.update(dt)
  }
}

describe('placement', () => {
  let game: Game

  beforeEach(() => {
    game = oneWave({ groups: [], reward: 0 })
  })

  it('accepts a valid placement and deducts essence', () => {
    const before = game.essence
    expect(game.place('hexcauldron', { col: 1, row: 1 })).toBe(true)
    expect(game.essence).toBe(before - STRUCTURE_DEFS.hexcauldron.cost)
    expect(game.grid.structureAt({ col: 1, row: 1 })).not.toBeNull()
  })

  it('rejects occupied hexes', () => {
    game.place('hexcauldron', { col: 1, row: 1 })
    expect(game.canPlace('stormtotem', { col: 1, row: 1 })).toEqual({ ok: false, reason: 'blocked' })
  })

  it('rejects the ritual and entrance hexes', () => {
    expect(game.canPlace('hexcauldron', game.grid.ritual).ok).toBe(false)
    expect(game.canPlace('hexcauldron', game.grid.entrance).ok).toBe(false)
  })

  it('rejects out of bounds hexes', () => {
    expect(game.canPlace('hexcauldron', { col: -1, row: 2 }).ok).toBe(false)
    expect(game.canPlace('hexcauldron', { col: 99, row: 99 }).ok).toBe(false)
  })

  it('rejects placements that seal the entrance', () => {
    for (const row of [0, 1, 3, 4]) {
      expect(game.place('hexcauldron', { col: 3, row })).toBe(true)
    }
    const result = game.canPlace('hexcauldron', { col: 3, row: 2 })
    expect(result).toEqual({ ok: false, reason: 'sealed' })
  })

  it('allows thorn groves on the only path since they never seal', () => {
    for (const row of [0, 1, 3, 4]) {
      game.place('hexcauldron', { col: 3, row })
    }
    expect(game.place('thorngrove', { col: 3, row: 2 })).toBe(true)
  })

  it('rejects unaffordable placements', () => {
    const config: GameConfig = {
      cols: 7,
      rows: 5,
      entrance: { col: 0, row: 2 },
      ritual: { col: 4, row: 2 },
      waves: [],
      startEssence: 10,
      startStability: 10
    }
    const poor = new Game(config, DEFS)
    expect(poor.canPlace('stormtotem', { col: 1, row: 1 })).toEqual({ ok: false, reason: 'unaffordable' })
  })

  it('emits fieldChanged when the path is altered', () => {
    let changed = 0
    game.events.on('fieldChanged', () => changed++)
    game.place('hexcauldron', { col: 1, row: 1 })
    expect(changed).toBe(1)
  })
})

describe('waves and combat', () => {
  it('spawns enemies over time and they walk to the ritual', () => {
    const game = oneWave({ groups: [{ enemy: 'militia', count: 1, interval: 0.5, delay: 0 }], reward: 10 }, 10)
    game.startWave()
    expect(game.phase).toBe('active')
    step(game, 0.5)
    expect(game.enemies.length).toBe(1)
    step(game, 20)
    expect(game.enemies.length).toBe(0)
    expect(game.stability).toBe(9)
  })

  it('rewards essence on death', () => {
    const game = oneWave({ groups: [{ enemy: 'militia', count: 1, interval: 0.5, delay: 0 }], reward: 10 })
    game.startWave()
    step(game, 0.5)
    const enemy = game.enemies[0]
    const before = game.essence
    enemy.hp = 0
    step(game, 0.1)
    expect(game.enemies.length).toBe(0)
    expect(game.essence).toBe(before + ENEMY_DEFS.militia.reward + 10)
  })

  it('completes a wave and returns to building phase', () => {
    const config: GameConfig = {
      cols: 7,
      rows: 5,
      entrance: { col: 0, row: 2 },
      ritual: { col: 4, row: 2 },
      waves: [
        { groups: [{ enemy: 'militia', count: 2, interval: 0.3, delay: 0 }], reward: 15 },
        { groups: [{ enemy: 'militia', count: 2, interval: 0.3, delay: 0 }], reward: 15 }
      ],
      startEssence: 500,
      startStability: 10
    }
    const game = new Game(config, DEFS)
    const before = game.essence
    game.startWave()
    step(game, 40)
    expect(game.phase).toBe('building')
    expect(game.progress).toBe(50)
    expect(game.waveIndex).toBe(1)
    expect(game.essence).toBeGreaterThan(before)
  })

  it('wins after the final wave is cleared', () => {
    const game = oneWave({ groups: [{ enemy: 'runner', count: 1, interval: 0.5, delay: 0 }], reward: 5 })
    let won = false
    game.events.on('won', () => {
      won = true
    })
    game.startWave()
    step(game, 60)
    expect(game.phase).toBe('won')
    expect(won).toBe(true)
  })

  it('loses when stability reaches zero', () => {
    const game = oneWave(
      { groups: [{ enemy: 'militia', count: 3, interval: 0.2, delay: 0 }], reward: 0 },
      2
    )
    let lost = false
    game.events.on('lost', () => {
      lost = true
    })
    game.startWave()
    step(game, 60)
    expect(game.phase).toBe('lost')
    expect(lost).toBe(true)
  })

  it('poisons enemies inside cauldron aura', () => {
    const game = oneWave({ groups: [{ enemy: 'militia', count: 1, interval: 0.5, delay: 0 }], reward: 0 })
    game.place('hexcauldron', { col: 1, row: 2 })
    game.startWave()
    step(game, 6)
    const enemy = game.enemies[0]
    if (enemy) {
      expect(enemy.hp).toBeLessThan(ENEMY_DEFS.militia.hp)
    } else {
      expect(game.enemies.length).toBe(0)
    }
  })

  it('totems strike clustered enemies with lightning', () => {
    const game = oneWave({
      groups: [
        { enemy: 'militia', count: 3, interval: 8, delay: 0 },
        { enemy: 'militia', count: 3, interval: 8, delay: 4 }
      ],
      reward: 0
    })
    game.place('stormtotem', { col: 2, row: 2 })
    let strikes = 0
    game.events.on<LightningPayload>('lightning', p => {
      if (p.points.length >= 2) strikes++
    })
    game.startWave()
    step(game, 30)
    expect(strikes).toBeGreaterThan(0)
  })
})
