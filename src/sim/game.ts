import { BattlefieldGrid, type PlacedStructure } from './grid'
import { FlowField } from './flowfield'
import { Emitter } from './events'
import { Enemy } from './enemy'
import { Ally } from './ally'
import { createStructure, currentTier, kindStats, type StructureInstance } from './structures'
import { hexDistance, hexToWorld, lerpHexToWorld, type HexCoord, type WorldPos } from './hex'
import type {
  CauldronStats,
  EnemyDef,
  ForkOption,
  GameConfig,
  PlaceResult,
  StructureDef,
  UpgradeTier,
  WaveDef
} from './types'

export type GamePhase = 'building' | 'active' | 'won' | 'lost'

export interface LightningPayload {
  points: WorldPos[]
}

export interface TeleportPayload {
  enemyId: number
  from: WorldPos
  to: WorldPos
}

export type UpgradeResult = 'ok' | 'unaffordable' | 'maxed' | 'invalid'

const ALLY_CAP = 30

function hexKey(hex: HexCoord): string {
  return `${hex.col},${hex.row}`
}

export class Game {
  readonly grid: BattlefieldGrid
  field: FlowField
  enemies: Enemy[] = []
  allies: Ally[] = []
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
  private byHex = new Map<string, StructureInstance>()
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

  nextWavePreview(): WaveDef | null {
    return this.phase === 'building' ? (this.waves[this.waveIndex] ?? null) : null
  }

  structureAt(hex: HexCoord): StructureInstance | null {
    if (!this.grid.inBounds(hex)) return null
    return this.byHex.get(hexKey(hex)) ?? null
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
    this.byHex.set(hexKey(hex), inst)
    this.afterBattlefieldChanged()
    this.events.emit('structurePlaced', inst)
    return true
  }

  upgradeOptions(inst: StructureInstance): { next?: UpgradeTier; forks?: ForkOption[] } {
    if (inst.forkId) return {}
    const tier = inst.def.tiers[inst.tierIndex]
    if (tier.forks?.length) return { forks: tier.forks }
    const next = inst.def.tiers[inst.tierIndex + 1]
    return next ? { next } : {}
  }

  upgrade(inst: StructureInstance, forkId?: string): UpgradeResult {
    if (inst.forkId) return 'maxed'
    const opts = this.upgradeOptions(inst)
    let chosen: UpgradeTier | ForkOption
    let forked = false
    if (opts.forks) {
      const fork = forkId ? opts.forks.find(f => f.id === forkId) : undefined
      if (!fork) return 'invalid'
      chosen = fork
      forked = true
    } else if (opts.next) {
      chosen = opts.next
    } else {
      return 'maxed'
    }
    if (this.essence < chosen.cost) return 'unaffordable'
    this.essence -= chosen.cost
    if (forked) inst.forkId = (chosen as ForkOption).id
    else inst.tierIndex++
    if (kindStats(inst).kind === 'grove') this.afterBattlefieldChanged()
    this.events.emit('structureUpgraded', inst)
    return 'ok'
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

    this.applyCauldrons(dt)
    this.applyOrbs()
    this.applyGates(dt)
    this.applyTotems(dt)
    this.applyAllies(dt)
    this.applyStructureAttacks(dt)

    const breaches: Enemy[] = []
    for (const e of this.enemies) {
      e.tickEffects(dt)
      if (e.hp > 0 && !e.attackingHex) {
        const result = e.advance(dt, c => this.field.nextStep(c))
        if (result === 'arrived') breaches.push(e)
      }
    }

    this.compactEnemies(breaches)

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

  private applyCauldrons(dt: number): void {
    for (const e of this.enemies) e.inAura = false
    const cauldron = this.firstCauldronStats()
    if (!cauldron) return
    for (const s of this.structures) {
      if (kindStats(s).kind !== 'cauldron') continue
      const radius = currentTier(s).radius
      for (const e of this.enemies) {
        if (!e.inAura && hexDistance(s.hex, e.cur) <= radius) e.inAura = true
      }
    }
    for (const e of this.enemies) {
      if (e.inAura) {
        if (e.poisonStacks < cauldron.maxStacks) {
          e.stackProgress += dt
          if (e.stackProgress >= cauldron.stackInterval) {
            e.stackProgress -= cauldron.stackInterval
            const resist = e.def.curseResist ?? 0
            if (Math.random() >= resist) {
              this.gainPoison(e, cauldron)
            }
          }
        } else {
          e.poisonRemaining = cauldron.stackDuration
        }
      }
      if (e.poisonStacks > 0 && e.poisonRemaining > 0) {
        e.poisonedTime += dt
        let dps = e.poisonStacks * cauldron.dpsPerStack
        if (cauldron.frenzyPerSec) dps *= 1 + cauldron.frenzyPerSec * e.poisonedTime
        e.hp -= dps * dt
      }
    }
  }

  private gainPoison(source: Enemy, cauldron: CauldronStats): void {
    source.poisonStacks = Math.min(source.poisonStacks + 1, cauldron.maxStacks)
    source.poisonRemaining = cauldron.stackDuration
    if (!cauldron.spreadRadius) return
    for (const other of this.enemies) {
      if (other === source || other.poisonStacks >= cauldron.maxStacks) continue
      if (hexDistance(source.cur, other.cur) <= cauldron.spreadRadius) {
        other.poisonStacks++
        other.poisonRemaining = cauldron.stackDuration
      }
    }
  }

  private firstCauldronStats(): CauldronStats | null {
    for (const s of this.structures) {
      const stats = kindStats(s)
      if (stats.kind === 'cauldron') return stats.cauldron
    }
    return null
  }

  private applyOrbs(): void {
    for (const s of this.structures) {
      if (kindStats(s).kind !== 'orb') continue
      const radius = currentTier(s).radius
      for (const e of this.enemies) {
        if (!e.revealed && hexDistance(s.hex, e.cur) <= radius) {
          e.revealed = true
          this.events.emit('enemyRevealed', e)
        }
      }
    }
  }

  private applyGates(dt: number): void {
    for (const s of this.structures) {
      const stats = kindStats(s)
      if (stats.kind !== 'gate') continue
      const gate = stats.gate
      s.cooldown -= dt
      if (s.cooldown > 0) continue
      const inRange = this.enemies
        .filter(e => e.history.length > 0 && hexDistance(s.hex, e.cur) <= currentTier(s).radius)
        .sort((a, b) => hexDistance(s.hex, a.cur) - hexDistance(s.hex, b.cur))
      const target = inRange[0]
      if (!target) continue
      const from = lerpHexToWorld(target.cur, target.next, target.t)
      const dest = target.teleportBack(gate.steps)
      if (!dest) continue
      s.cooldown = gate.cooldown
      this.events.emit<TeleportPayload>('teleport', {
        enemyId: target.id,
        from,
        to: hexToWorld(dest)
      })
    }
  }

  private applyTotems(dt: number): void {
    for (const s of this.structures) {
      const stats = kindStats(s)
      if (stats.kind !== 'totem') continue
      const totem = stats.totem
      s.cooldown -= dt
      if (s.cooldown > 0) continue
      const range = currentTier(s).radius
      const inRange = this.enemies
        .filter(e => hexDistance(s.hex, e.cur) <= range)
        .sort((a, b) => hexDistance(s.hex, a.cur) - hexDistance(s.hex, b.cur))
      if (!inRange.length) continue
      const hit: Enemy[] = [inRange[0]]
      let last = inRange[0]
      while (hit.length < totem.maxTargets) {
        let best: Enemy | null = null
        let bd = Infinity
        for (const e of inRange) {
          if (hit.includes(e)) continue
          const d = hexDistance(last.cur, e.cur)
          if (d <= totem.chainRange && d < bd) {
            bd = d
            best = e
          }
        }
        if (!best) break
        hit.push(best)
        last = best
      }
      for (const e of hit) e.hp -= totem.damage
      s.cooldown = totem.cooldown
      const points: WorldPos[] = [hexToWorld(s.hex)]
      for (const e of hit) points.push(lerpHexToWorld(e.cur, e.next, e.t))
      this.events.emit<LightningPayload>('lightning', { points })
    }
  }

  private applyAllies(dt: number): void {
    for (const a of this.allies) {
      a.remaining -= dt
      let best: Enemy | null = null
      let bd = Infinity
      for (const e of this.enemies) {
        const d = hexDistance(a.hex, e.cur)
        if (d <= a.attackRadius && d < bd) {
          bd = d
          best = e
        }
      }
      if (best) best.hp -= a.dps * dt
    }
    this.allies = this.allies.filter(a => a.remaining > 0)
  }

  private applyStructureAttacks(dt: number): void {
    for (const e of this.enemies) {
      const sd = e.def.structureDamage ?? 0
      if (!sd || e.hp <= 0) {
        e.attackingHex = null
        continue
      }
      const range = e.def.structureRange ?? 1.15
      const blockingOnly = e.def.targetsBlockingOnly ?? true
      let best: StructureInstance | null = null
      let bd = Infinity
      for (const s of this.structures) {
        if (blockingOnly && !s.def.blocksPath) continue
        const d = hexDistance(e.cur, s.hex)
        if (d <= range && d < bd) {
          bd = d
          best = s
        }
      }
      e.attackingHex = best ? { ...best.hex } : null
      if (best) {
        best.hp -= sd * dt
        if (best.hp <= 0) this.destroyStructure(best)
      }
    }
  }

  private destroyStructure(s: StructureInstance): void {
    const i = this.structures.indexOf(s)
    if (i >= 0) this.structures.splice(i, 1)
    this.byHex.delete(hexKey(s.hex))
    this.grid.removeStructureAt(s.hex)
    this.afterBattlefieldChanged()
    this.events.emit('structureDestroyed', s)
  }

  private compactEnemies(breaches: Enemy[]): void {
    const survivors: Enemy[] = []
    for (const e of this.enemies) {
      if (e.hp <= 0) {
        this.essence += e.def.reward
        this.tryRaiseAlly(e.cur)
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
  }

  private tryRaiseAlly(hex: HexCoord): void {
    if (this.allies.length >= ALLY_CAP) return
    for (const s of this.structures) {
      const stats = kindStats(s)
      if (stats.kind !== 'ring') continue
      const ring = stats.ring
      if (hexDistance(s.hex, hex) > currentTier(s).radius) continue
      const key = hexKey(s.hex)
      const owned = this.allies.filter(a => a.ownerId === key).length
      if (owned >= ring.maxActive) continue
      if (Math.random() < ring.raiseChance) {
        const ally = new Ally(ring.dps, ring.duration, ring.attackRadius, hex)
        ally.ownerId = key
        this.allies.push(ally)
      }
      break
    }
  }

  private afterBattlefieldChanged(): void {
    this.rebuildPenalties()
    this.field = new FlowField(this.grid)
    this.events.emit('fieldChanged')
  }

  private rebuildPenalties(): void {
    this.grid.resetPenalties()
    for (const s of this.structures) {
      const stats = kindStats(s)
      if (stats.kind === 'grove') {
        this.grid.addPenalty(s.hex, currentTier(s).radius, stats.grove.costPenalty)
      }
    }
  }
}
