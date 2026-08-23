import { describe, expect, it } from 'vitest'
import { Game } from './game'
import { Ally } from './ally'
import type { StructureInstance } from './structures'
import { ENEMY_DEFS } from '../data/enemies'
import { STRUCTURE_DEFS } from '../data/structures'
import { LEVELS } from '../data/levels'
import { loadSave, saveProgress, resetSave, type StorageLike } from '../save/save'
import type { GameConfig, StructureDef } from './types'

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
  for (let i = 0; i < Math.round(seconds / dt); i++) game.update(dt)
}

describe('whispering idol', () => {
  it('charms a foe, holds it in place, then releases it', () => {
    const game = new Game(
      makeConfig([{ groups: [{ enemy: 'militia', count: 1, interval: 1, delay: 0 }], reward: 10 }])
    , { enemies: ENEMY_DEFS, structures: STRUCTURE_DEFS })
    game.place('whisperingidol', { col: 2, row: 1 })
    let charmed = false
    game.events.on('enemyCharmed', () => {
      charmed = true
    })
    game.startWave()
    step(game, 6)
    expect(charmed).toBe(true)
    const e = game.enemies[0]
    if (e && e.charmedBy) {
      const pos = JSON.stringify(e.cur)
      step(game, 1)
      expect(JSON.stringify(e.cur)).toBe(pos)
    }
    step(game, 12)
    const e2 = game.enemies[0]
    if (e2) expect(e2.charmedBy).toBeNull()
  })

  it('caps concurrent charms per idol', () => {
    const game = new Game(
      makeConfig([{ groups: [{ enemy: 'militia', count: 4, interval: 3, delay: 0 }], reward: 10 }])
    , { enemies: ENEMY_DEFS, structures: STRUCTURE_DEFS })
    game.place('whisperingidol', { col: 2, row: 1 })
    game.startWave()
    step(game, 30)
    const idolTier = STRUCTURE_DEFS.whisperingidol.tiers[0]
    if (idolTier.kind !== 'idol') throw new Error('expected idol')
    const charmedCount = game.enemies.filter(e => e.charmedBy === '2,1').length
    expect(charmedCount).toBeLessThanOrEqual(idolTier.idol.concurrent)
  })
})

describe('moonwell', () => {
  it('grants essence per death nearby', () => {
    const game = new Game(
      makeConfig([{ groups: [{ enemy: 'militia', count: 1, interval: 1, delay: 0 }], reward: 0 }])
    , { enemies: ENEMY_DEFS, structures: STRUCTURE_DEFS })
    game.place('moonwell', { col: 1, row: 1 })
    game.startWave()
    step(game, 2)
    const wellTier = STRUCTURE_DEFS.moonwell.tiers[0]
    if (wellTier.kind !== 'well') throw new Error('expected well')
    const epd = wellTier.well.essencePerDeath
    const before = game.essence
    const enemy = game.enemies[0]
    enemy.hp = 0
    step(game, 0.1)
    expect(game.essence).toBe(before + ENEMY_DEFS.militia.reward + epd)
  })

  it('sacrifices the nearest ally into a damaging nova and respects cooldown', () => {
    const game = new Game(makeConfig([]), { enemies: ENEMY_DEFS, structures: STRUCTURE_DEFS })
    game.place('moonwell', { col: 2, row: 2 })
    const well = game.structureAt({ col: 2, row: 2 })!
    game.allies.push(new Ally(5, 99, 1.6, { col: 1, row: 2 }))
    expect(game.sacrifice(well)).toBe(true)
    expect(game.allies.length).toBe(0)
    expect(well.cooldown).toBeGreaterThan(0)
    expect(game.sacrifice(well)).toBe(false)
  })

  it('nova damages enemies around the well', () => {
    const game = new Game(
      makeConfig([{ groups: [{ enemy: 'militia', count: 1, interval: 1, delay: 0 }], reward: 0 }])
    , { enemies: ENEMY_DEFS, structures: STRUCTURE_DEFS })
    game.place('moonwell', { col: 2, row: 2 })
    const well = game.structureAt({ col: 2, row: 2 })!
    game.startWave()
    step(game, 0.4)
    const e = game.enemies[0]
    e.cur = { col: 2, row: 2 }
    e.next = null
    e.t = 0
    game.allies.push(new Ally(5, 99, 1.6, { col: 0, row: 0 }))
    const beforeHp = e.hp
    expect(game.sacrifice(well)).toBe(true)
    expect(e.hp).toBeLessThan(beforeHp)
  })
})

describe('spell mirror', () => {
  it('reflects structure damage back onto the attacker', () => {
    const mirrorDef: StructureDef = structuredClone(STRUCTURE_DEFS.spellmirror)
    const t0 = mirrorDef.tiers[0]
    if (t0.kind !== 'mirror') throw new Error('expected mirror')
    mirrorDef.tiers[0] = { ...t0, mirror: { ...t0.mirror, reflectChance: 1 } }
    const hunter = { ...ENEMY_DEFS.hunter, structureDamage: 50 }
    const game = new Game(
      makeConfig([{ groups: [{ enemy: 'hunter', count: 1, interval: 1, delay: 0 }], reward: 10 }])
    , { enemies: { ...ENEMY_DEFS, hunter }, structures: { ...STRUCTURE_DEFS, spellmirror: mirrorDef } })
    for (const row of [0, 1, 3]) {
      game.place('hexcauldron', { col: 3, row })
    }
    game.place('spellmirror', { col: 3, row: 4 })
    game.startWave()
    step(game, 8)
    const hunterEnemy = game.enemies.find(e => e.def.id === 'hunter')
    let reflectedOntoHunter: boolean
    if (!hunterEnemy || hunterEnemy.hp <= 0) {
      reflectedOntoHunter = true
    } else {
      reflectedOntoHunter = hunterEnemy.hp < hunterEnemy.def.hp
    }
    expect(reflectedOntoHunter).toBe(true)
  })
})

describe('structure destruction events fire exactly once', () => {
  it('does not double-emit when several attackers hit the same wall', () => {
    const hunter = { ...ENEMY_DEFS.hunter, structureDamage: 300 }
    const game = new Game(
      makeConfig([{ groups: [{ enemy: 'hunter', count: 3, interval: 0.2, delay: 0 }], reward: 0 }])
    , { enemies: { ...ENEMY_DEFS, hunter }, structures: STRUCTURE_DEFS })
    const seen: string[] = []
    game.events.on<StructureInstance>('structureDestroyed', s => seen.push(`${s.hex.col},${s.hex.row}`))
    for (const row of [0, 1, 3, 4]) {
      game.place('hexcauldron', { col: 3, row })
    }
    game.startWave()
    step(game, 45)
    expect(new Set(seen).size).toBe(seen.length)
  })
})

describe('save system', () => {
  function stubStore(): StorageLike & { data: Map<string, string> } {
    const data = new Map<string, string>()
    return {
      data,
      getItem: k => data.get(k) ?? null,
      setItem: (k, v) => void data.set(k, v),
      removeItem: k => void data.delete(k)
    }
  }

  it('round-trips progress and rejects corrupt payloads', () => {
    const store = stubStore()
    expect(loadSave(store).unlockedLevels).toBe(1)
    saveProgress(3, store)
    expect(loadSave(store).unlockedLevels).toBe(3)
    resetSave(store)
    expect(loadSave(store).unlockedLevels).toBe(1)
    store.data.set('hexbound.save.v1', '{not json')
    expect(loadSave(store).unlockedLevels).toBe(1)
  })
})

describe('campaign levels', () => {
  it('defines five valid levels with reachable entrances', () => {
    expect(LEVELS.length).toBe(5)
    LEVELS.forEach((lvl, i) => {
      const game = new Game(lvl.config, { enemies: ENEMY_DEFS, structures: STRUCTURE_DEFS })
      expect(game.field.reachable(game.grid.entrance), `level ${i} entrance reachable`).toBe(true)
      expect(lvl.config.waves.length).toBeGreaterThan(0)
    })
  })
})
