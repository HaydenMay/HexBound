import { BattlefieldGrid, type PlacedStructure } from './grid'
import { FlowField } from './flowfield'
import { Emitter } from './events'
import { Enemy } from './enemy'
import { createStructure, type StructureInstance } from './structures'
import { hexDistance, hexToWorld, lerpHexToWorld, type HexCoord, type WorldPos } from './hex'
import type { CauldronStats, EnemyDef, GameConfig, PlaceResult, StructureDef, WaveDef } from './types'

export type GamePhase = 'building' | 'active' | 'won' | 'lost'

export interface LightningPayload {
  points: WorldPos[]
}

export class Game {
  readonly grid: BattlefieldGrid
  field: FlowField
  enemies: Enemy[] = []
  structures: StructureInstance[] = []
  essence: number
  stability: number
  readonly maxStability: number
  progress = 0
  phase: GamePhase = 'building'
  waveIndex = 0
  readonly events = new Emitter()

  private spawnQueue: { enemy: string; at: number }[] = []
  private clock = 0
  private enemyDefs: Record<string, EnemyDef>
  private structureDefs: Record<string, StructureDef>
  private waves: WaveDef[]

  constructor(
    config: GameConfig,
    defs: { enemies: Record<string, EnemyDef>; structures: Record<string, StructureDef> }
  ) {
    this.grid = new BattlefieldGrid(config)
    this.field = new FlowField(this.grid)
    this.essence = config.startEssence
    this.stability = config.startStability
    this.maxStability = config.startStability
    this.waves = config.waves
    this.enemyDefs = defs.enemies
    this.structureDefs = defs.structures
  }

  get currentWave(): number {
    return Math.min(this.waveIndex + 1, this.waves.length)
  }

  get totalWaves(): number {
    return this.waves.length
  }

  canPlace(defId: string, hex: HexCoord): PlaceResult {
    const def = this.structureDefs[defId]
    if (!def || !this.grid.inBounds(hex)) return { ok: false, reason: 'blocked' }
    if (!this.grid.placeable(hex)) return { ok: false, reason: 'blocked' }
    if (this.essence < def.cost) return { ok: false, reason: 'unaffordable' }
    if (def.blocksPath) {
      const probe: PlacedStructure = { defId, hex, blocksPath: true }
      this.grid.setStructure(probe)
      const test = new FlowField(this.grid)
      this.grid.removeStructureAt(hex)
      if (!test.reachable(this.grid.entrance)) {
        return { ok: false, reason: 'sealed' }
      }
    }
    return { ok: true }
  }

  place(defId: string, hex: HexCoord): boolean {
    const check = this.canPlace(defId, hex)
    if (!check.ok) return false
    const def = this.structureDefs[defId]
    this.essence -= def.cost
    this.grid.setStructure({ defId, hex, blocksPath: def.blocksPath })
    const inst = createStructure(def, hex)
    this.structures.push(inst)
    this.rebuildPenalties()
    this.field = new FlowField(this.grid)
    this.events.emit('structurePlaced', inst)
    this.events.emit('fieldChanged')
    return true
  }

  startWave(): void {
    if (this.phase !== 'building') return
    const wave = this.waves[this.waveIndex]
    if (!wave) return
    for (const g of wave.groups) {
      for (let i = 0; i < g.count; i++) {
        this.spawnQueue.push({ enemy: g.enemy, at: g.delay + i * g.interval })
      }
    }
    this.spawnQueue.sort((a, b) => a.at - b.at)
    this.clock = 0
    this.phase = 'active'
    this.events.emit('waveStarted', this.currentWave)
  }

  update(dt: number): void {
    if (this.phase === 'won' || this.phase === 'lost') return

    if (this.phase === 'active') {
      this.clock += dt
      while (this.spawnQueue.length && this.spawnQueue[0].at <= this.clock) {
        const entry = this.spawnQueue.shift()!
        const e = new Enemy(this.enemyDefs[entry.enemy], this.grid.entrance)
        this.enemies.push(e)
        this.events.emit('enemySpawned', e)
      }
    }

    const cauldron = this.firstCauldronStats()

    for (const e of this.enemies) e.inAura = false
    if (cauldron) {
      for (const s of this.structures) {
        if (s.def.kind !== 'cauldron') continue
        for (const e of this.enemies) {
          if (!e.inAura && hexDistance(s.hex, e.cur) <= s.def.auraRadius) {
            e.inAura = true
          }
        }
      }
      for (const e of this.enemies) {
        if (e.inAura) {
          if (e.poisonStacks < cauldron.maxStacks) {
            e.stackProgress += dt
            if (e.stackProgress >= cauldron.stackInterval) {
              e.stackProgress -= cauldron.stackInterval
              e.poisonStacks++
              e.poisonRemaining = cauldron.stackDuration
            }
          } else {
            e.poisonRemaining = cauldron.stackDuration
          }
        }
        if (e.poisonStacks > 0 && e.poisonRemaining > 0) {
          e.hp -= e.poisonStacks * cauldron.dpsPerStack * dt
        }
      }
    }

    for (const s of this.structures) {
      if (s.def.kind !== 'totem' || !s.def.totem) continue
      const t = s.def.totem
      s.cooldown -= dt
      if (s.cooldown > 0) continue
      const inRange = this.enemies
        .filter(e => hexDistance(s.hex, e.cur) <= t.range)
        .sort((a, b) => hexDistance(s.hex, a.cur) - hexDistance(s.hex, b.cur))
      if (!inRange.length) continue
      const hit: Enemy[] = [inRange[0]]
      let last = inRange[0]
      while (hit.length < t.maxTargets) {
        let best: Enemy | null = null
        let bd = Infinity
        for (const e of inRange) {
          if (hit.includes(e)) continue
          const d = hexDistance(last.cur, e.cur)
          if (d <= t.chainRange && d < bd) {
            bd = d
            best = e
          }
        }
        if (!best) break
        hit.push(best)
        last = best
      }
      for (const e of hit) e.hp -= t.damage
      s.cooldown = t.cooldown
      const points: WorldPos[] = [hexToWorld(s.hex)]
      for (const e of hit) points.push(lerpHexToWorld(e.cur, e.next, e.t))
      this.events.emit<LightningPayload>('lightning', { points })
    }

    const breaches: Enemy[] = []
    for (const e of this.enemies) {
      const result = e.update(dt, c => this.field.nextStep(c))
      if (result === 'arrived') breaches.push(e)
    }

    const survivors: Enemy[] = []
    for (const e of this.enemies) {
      if (e.hp <= 0) {
        this.essence += e.def.reward
        this.events.emit('enemyDied', e)
        continue
      }
      if (breaches.includes(e)) {
        this.stability -= e.def.ritualDamage
        this.events.emit('enemyBreached', e)
        continue
      }
      survivors.push(e)
    }
    this.enemies = survivors

    if (this.stability <= 0) {
      this.stability = 0
      this.phase = 'lost'
      this.events.emit('lost')
      return
    }

    if (this.phase === 'active' && !this.spawnQueue.length && !this.enemies.length) {
      const wave = this.waves[this.waveIndex]
      this.essence += wave.reward
      this.progress = ((this.waveIndex + 1) / this.waves.length) * 100
      this.events.emit('waveCleared', this.currentWave)
      this.waveIndex++
      if (this.waveIndex >= this.waves.length) {
        this.phase = 'won'
        this.events.emit('won')
      } else {
        this.phase = 'building'
      }
    }
  }

  private firstCauldronStats(): CauldronStats | null {
    for (const s of this.structures) {
      if (s.def.kind === 'cauldron' && s.def.cauldron) return s.def.cauldron
    }
    return null
  }

  private rebuildPenalties(): void {
    this.grid.resetPenalties()
    for (const s of this.structures) {
      if (s.def.kind === 'grove' && s.def.grove) {
        this.grid.addPenalty(s.hex, s.def.grove.penaltyRadius, s.def.grove.costPenalty)
      }
    }
  }
}
