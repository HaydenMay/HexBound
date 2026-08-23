import { describe, expect, it } from 'vitest'
import { Game } from './game'
import { ENEMY_DEFS } from '../data/enemies'
import { STRUCTURE_DEFS } from '../data/structures'
import type { GameConfig, EnemyDef } from './types'

const DT = 1 / 30

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

function makeGame(
  waves: GameConfig['waves'],
  enemyOverrides: Record<string, Partial<EnemyDef>> = {}
): Game {
  const enemies = { ...ENEMY_DEFS }
  for (const [id, patch] of Object.entries(enemyOverrides)) {
    enemies[id] = { ...ENEMY_DEFS[id], ...patch } as EnemyDef
  }
  return new Game(makeConfig(waves), { enemies, structures: STRUCTURE_DEFS })
}

function stepFor(game: Game, seconds: number): void {
  for (let i = 0; i < Math.round(seconds / DT); i++) game.update(DT)
}

describe('paladin cleansing', () => {
  it('strikes curses from nearby allies but never cleanses itself', () => {
    const game = makeGame(
      [
        {
          groups: [
            { enemy: 'militia', count: 1, interval: 1, delay: 0 },
            { enemy: 'paladin', count: 1, interval: 1, delay: 0 }
          ],
          reward: 0
        }
      ],
      {
        paladin: { curseResist: 0, speed: 0.05, hp: 500 },
        militia: { speed: 0.05, hp: 500 }
      }
    )
    game.place('hexcauldron', { col: 1, row: 1 })
    game.startWave()
    let guard = 0
    const paladin = () => game.enemies.find(e => e.def.id === 'paladin')!
    const ally = () => game.enemies.find(e => e.def.id === 'militia')!
    let t = 0
    while (guard++ < 3000 && !(paladin()?.poisonStacks > 0 && ally()?.poisonStacks > 0)) {
      game.update(DT)
      t += DT
    }
    expect(t).toBeLessThan(3)
    expect(paladin().poisonStacks).toBeGreaterThan(0)
    expect(ally().poisonStacks).toBeGreaterThan(0)
    const paladinStacksAtCleanse = paladin().poisonStacks
    stepFor(game, 3.8 - t)
    expect(ally().poisonStacks).toBe(0)
    expect(ally().poisonRemaining).toBe(0)
    expect(paladin().poisonStacks).toBeGreaterThanOrEqual(paladinStacksAtCleanse)
    expect(paladin().poisonRemaining).toBeGreaterThan(0)
  })
})

describe('elite inquisitor silence', () => {
  it('silences a totem in range, then the totem recovers', () => {
    const game = makeGame(
      [{ groups: [{ enemy: 'inquisitor', count: 1, interval: 1, delay: 0 }], reward: 0 }],
      { inquisitor: { speed: 0.3, structureDamage: 0 } }
    )
    game.place('stormtotem', { col: 2, row: 1 })
    game.startWave()
    const totem = () => game.structureAt({ col: 2, row: 1 })!
    let sawSilenced = false
    let sawRecoveredAfterSilence = false
    for (let i = 0; i < Math.round(14 / DT); i++) {
      game.update(DT)
      if (!totem()) break
      if (totem().disabled > 0) sawSilenced = true
      else if (sawSilenced) sawRecoveredAfterSilence = true
    }
    expect(sawSilenced).toBe(true)
    expect(sawRecoveredAfterSilence).toBe(true)
    expect(totem()).toBeTruthy()
  })
})

describe('grand inquisitor summons', () => {
  it('calls reinforcements that extend the wave beyond the original spawn list', () => {
    const game = makeGame(
      [{ groups: [{ enemy: 'grandinquisitor', count: 1, interval: 1, delay: 0 }], reward: 10 }],
      { grandinquisitor: { speed: 0.25 } }
    )
    let spawned = 0
    game.events.on('enemySpawned', () => spawned++)
    let clearedAt: number | null = null
    let elapsed = 0
    game.startWave()
    for (let i = 0; i < Math.round(12 / DT); i++) {
      game.update(DT)
      elapsed += DT
      if (clearedAt === null && game.phase !== 'active') clearedAt = elapsed
    }
    expect(spawned).toBeGreaterThanOrEqual(4)
    if (clearedAt !== null) expect(clearedAt).toBeGreaterThan(7)
    else expect(game.phase).toBe('active')
  })
})

describe('whispering idol vs charm-immune foes', () => {
  it('never charms an inquisitor', () => {
    const game = makeGame(
      [{ groups: [{ enemy: 'inquisitor', count: 1, interval: 1, delay: 0 }], reward: 0 }],
      { inquisitor: { structureDamage: 0 } }
    )
    game.place('whisperingidol', { col: 2, row: 1 })
    let charmedAny = false
    game.events.on('enemyCharmed', () => {
      charmedAny = true
    })
    game.startWave()
    stepFor(game, 12)
    expect(charmedAny).toBe(false)
    for (const e of game.enemies) expect(e.charmedBy).toBeNull()
  })
})

describe('selling structures', () => {
  it('refunds fully in the building phase but is sealed once foes march', () => {
    const game = makeGame([], {})
    game.place('bonepalisade', { col: 1, row: 1 })
    const first = game.structureAt({ col: 1, row: 1 })!
    expect(game.sellStructure(first)).toBe(STRUCTURE_DEFS.bonepalisade.cost)
    expect(game.structureAt({ col: 1, row: 1 })).toBeNull()

    game.place('bonepalisade', { col: 2, row: 1 })
    const second = game.structureAt({ col: 2, row: 1 })!
    game.phase = 'active'
    expect(game.sellStructure(second)).toBe(0)
    expect(game.structureAt({ col: 2, row: 1 })).toBe(second)
  })
})

describe('watching eye amplification', () => {
  it('applies x1.15 shock to a weak knight inside the gaze and none outside', () => {
    const game = makeGame(
      [{ groups: [{ enemy: 'knight', count: 2, interval: 0.1, delay: 0 }], reward: 0 }]
    )
    game.place('watchingeye', { col: 1, row: 2 })
    game.startWave()
    stepFor(game, 0.5)
    expect(game.enemies.length).toBe(2)
    const [inside, outside] = game.enemies
    inside.cur = { col: 2, row: 2 }
    inside.next = null
    inside.t = 0
    outside.cur = { col: 6, row: 2 }
    outside.next = null
    outside.t = 0

    const insideHpBefore = inside.hp
    game.damageEnemy(inside, 100, 'shock')
    expect(inside.hp).toBeCloseTo(insideHpBefore - 115, 5)

    const outsideHpBefore = outside.hp
    game.damageEnemy(outside, 100, 'shock')
    expect(outside.hp).toBe(outsideHpBefore - 100)

    const burstTarget = game.enemies[0]
    const burstBefore = burstTarget.hp
    game.damageEnemy(burstTarget, 100, 'burst')
    expect(burstTarget.hp).toBe(burstBefore - 100)
  })
})

describe('watching eye scouting', () => {
  it('reveals each foe type that passes the gaze and remembers them after death', () => {
    const game = makeGame([
      {
        groups: [
          { enemy: 'militia', count: 1, interval: 1, delay: 0 },
          { enemy: 'runner', count: 1, interval: 1, delay: 0 }
        ],
        reward: 0
      }
    ])
    game.place('watchingeye', { col: 1, row: 2 })
    game.startWave()
    stepFor(game, 14)
    expect(game.phase).toBe('won')
    expect(game.enemies.length).toBe(0)
    expect(game.scouted.has('militia')).toBe(true)
    expect(game.scouted.has('runner')).toBe(true)
  })
})
