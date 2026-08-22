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
}

export interface TotemStats {
  damage: number
  maxTargets: number
  range: number
  chainRange: number
  cooldown: number
}

export interface GroveStats {
  penaltyRadius: number
  costPenalty: number
}

export interface StructureDef {
  id: string
  name: string
  blurb: string
  cost: number
  blocksPath: boolean
  auraRadius: number
  kind: 'cauldron' | 'totem' | 'grove'
  cauldron?: CauldronStats
  totem?: TotemStats
  grove?: GroveStats
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
