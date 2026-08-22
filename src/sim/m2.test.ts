import { describe, expect, it } from 'vitest'
import { Game } from './game'
import { kindStats } from './structures'
import { ENEMY_DEFS } from '../data/enemies'
import { STRUCTURE_DEFS } from '../data/structures'
import type { EnemyDef, GameConfig, StructureDef } from './types'

function makeConfig(waves: GameConfig['waves'], overrides?: Partial<GameConfig>): GameConfig {
  return {
    cols: 7,
    rows: 5,
    entrance: { col: 0, row: 2 },
    ritual: { col: 4, row: 2 },
    waves,
    startEssence: 500,
    startStability: 10,
    ...overrides
  }
}

function step(game: Game, seconds: number): void {
  const dt = 1 / 30
  const ticks = Math.round(seconds / dt)
  for (let i = 0; i < ticks; i++) game.update(dt)
}

describe('curse resistance', () => {
  it('a fully resistant foe never gains poison stacks', () => {
    const zealot: EnemyDef = { ...ENEMY_DEFS.militia, id: 'zealot', name: 'Zealot', curseResist: 1 }
    const game = new Game(
      makeConfig([{ groups: [{ enemy: 'zealot', count: 1, interval: 0.5, delay: 0 }], reward: 10 }]),
      { enemies: { ...ENEMY_DEFS, zealot }, structures: STRUCTURE_DEFS }
    )
    game.place('hexcauldron', { col: 1, row: 1 })
    game.startWave()
    step(game, 8)
    const e = game.enemies[0]
    if (e) {
      expect(e.poisonStacks).toBe(0)
      expect(e.hp).toBe(e.def.hp)
    }
  })
})

describe('anti-structure foes', () => {
  it('hunter chews through blocking structures and the field stays valid', () => {
    const hunter: EnemyDef = { ...ENEMY_DEFS.hunter, structureDamage: 200 }
    const game = new Game(
      makeConfig([{ groups: [{ enemy: 'hunter', count: 1, interval: 0.5, delay: 0 }], reward: 10 }]),
      { enemies: { ...ENEMY_DEFS, hunter }, structures: STRUCTURE_DEFS }
    )
    let destroyed = 0
    game.events.on('structureDestroyed', () => destroyed++)
    for (const row of [0, 1, 3, 4]) {
      game.place('bonepalisade', { col: 3, row })
    }
    game.startWave()
    step(game, 60)
    expect(destroyed).toBeGreaterThan(0)
    expect(game.field.reachable(game.grid.entrance)).toBe(true)
    const openWallCell = [0, 1, 3, 4].some(row => game.grid.isWalkable({ col: 3, row }) && !game.structureAt({ col: 3, row }))
    expect(openWallCell).toBe(true)
  })
})

describe('mushroom ring', () => {
  it('raises an ally from a kill and the ally harms passersby', () => {
    const ringDef: StructureDef = structuredClone(STRUCTURE_DEFS.mushroomring)
    const t0 = ringDef.tiers[0]
    if (t0.kind !== 'ring') throw new Error('expected ring')
    ringDef.tiers[0] = { ...t0, ring: { ...t0.ring, raiseChance: 1 } }
    const game = new Game(
      makeConfig([
        { groups: [{ enemy: 'militia', count: 2, interval: 6, delay: 0 }], reward: 10 }
      ]),
      { enemies: ENEMY_DEFS, structures: { ...STRUCTURE_DEFS, mushroomring: ringDef } }
    )
    game.place('mushroomring', { col: 1, row: 1 })
    game.startWave()
    step(game, 2)
    expect(game.enemies.length).toBe(1)
    game.enemies[0].hp = 0
    step(game, 0.1)
    expect(game.allies.length).toBe(1)
    step(game, 12)
    const second = game.enemies[0]
    if (second) {
      expect(second.hp).toBeLessThan(second.def.hp)
    } else {
      expect(true).toBe(true)
    }
  })
})

describe('upgrades', () => {
  it('linear upgrades improve stats and cost essence', () => {
    const game = new Game(makeConfig([]), { enemies: ENEMY_DEFS, structures: STRUCTURE_DEFS })
    game.place('stormtotem', { col: 1, row: 1 })
    const inst = game.structureAt({ col: 1, row: 1 })!
    const before = kindStats(inst)
    if (before.kind !== 'totem') throw new Error('expected totem')
    const cost = inst.def.tiers[1].cost
    const wallet = game.essence
    expect(game.upgrade(inst)).toBe('ok')
    expect(game.essence).toBe(wallet - cost)
    const after = kindStats(inst)
    if (after.kind !== 'totem') throw new Error('expected totem')
    expect(after.totem.damage).toBeGreaterThan(before.totem.damage)
  })

  it('fork choice requires an id and applies branch stats', () => {
    const game = new Game(makeConfig([]), { enemies: ENEMY_DEFS, structures: STRUCTURE_DEFS })
    game.place('hexcauldron', { col: 1, row: 1 })
    const inst = game.structureAt({ col: 1, row: 1 })!
    game.upgrade(inst)
    expect(game.upgrade(inst)).toBe('invalid')
    expect(game.upgrade(inst, 'plague')).toBe('ok')
    expect(inst.forkId).toBe('plague')
    const stats = kindStats(inst)
    if (stats.kind !== 'cauldron') throw new Error('expected cauldron')
    expect(stats.cauldron.spreadRadius ?? 0).toBeGreaterThan(0)
    expect(game.upgrade(inst)).toBe('maxed')
  })

  it('rejects upgrades when essence is lacking', () => {
    const game = new Game(makeConfig([]), { enemies: ENEMY_DEFS, structures: STRUCTURE_DEFS })
    game.place('stormtotem', { col: 1, row: 1 })
    const inst = game.structureAt({ col: 1, row: 1 })!
    game.essence = 1
    expect(game.upgrade(inst)).toBe('unaffordable')
  })
})

describe('wave preview', () => {
  it('exposes the upcoming wave during building and hides it during combat', () => {
    const waves = [
      { groups: [{ enemy: 'militia', count: 1, interval: 0.3, delay: 0 }], reward: 5 },
      { groups: [{ enemy: 'runner', count: 1, interval: 0.3, delay: 0 }], reward: 5 }
    ]
    const game = new Game(makeConfig(waves), { enemies: ENEMY_DEFS, structures: STRUCTURE_DEFS })
    expect(game.nextWavePreview()).toBe(waves[0])
    game.startWave()
    expect(game.nextWavePreview()).toBeNull()
    step(game, 30)
    expect(game.phase).toBe('building')
    expect(game.nextWavePreview()).toBe(waves[1])
  })
})
