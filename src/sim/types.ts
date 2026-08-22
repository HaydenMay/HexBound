import type { HexCoord } from './hex'

export interface EnemyDef {
  id: string
  name: string
  hp: number
  speed: number
  reward: number
  ritualDamage: number
  scale: number
  color: number
  curseResist?: number
  structureDamage?: number
  structureRange?: number
  targetsBlockingOnly?: boolean
  traitName?: string
}

export interface WaveGroup {
  enemy: string
  count: number
  interval: number
  delay: number
}

export interface WaveDef {
  groups: WaveGroup[]
  reward: number
}

export interface CauldronStats {
  dpsPerStack: number
  maxStacks: number
  stackInterval: number
  stackDuration: number
  spreadRadius?: number
  frenzyPerSec?: number
}

export interface TotemStats {
  damage: number
  maxTargets: number
  chainRange: number
  cooldown: number
}

export interface GroveStats {
  costPenalty: number
}

export interface GateStats {
  steps: number
  cooldown: number
}

export interface RingStats {
  raiseChance: number
  duration: number
  dps: number
  attackRadius: number
  maxActive: number
}

export type KindStats = {
  kind: 'cauldron'
  cauldron: CauldronStats
} | {
  kind: 'totem'
  totem: TotemStats
} | {
  kind: 'grove'
  grove: GroveStats
} | {
  kind: 'gate'
  gate: GateStats
} | {
  kind: 'ring'
  ring: RingStats
} | {
  kind: 'orb'
}

export type UpgradeTier = KindStats & {
  label: string
  desc: string
  cost: number
  radius: number
  forks?: ForkOption[]
}

export type ForkOption = KindStats & {
  id: string
  label: string
  desc: string
  cost: number
  radius: number
}

export interface StructureDef {
  id: string
  name: string
  blurb: string
  cost: number
  blocksPath: boolean
  hp: number
  color: number
  tiers: UpgradeTier[]
}

export interface GameConfig {
  cols: number
  rows: number
  entrance: HexCoord
  ritual: HexCoord
  waves: WaveDef[]
  startEssence: number
  startStability: number
}

export type PlaceError = 'blocked' | 'sealed' | 'unaffordable'

export type PlaceResult = { ok: true } | { ok: false; reason: PlaceError }
