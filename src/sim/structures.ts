import type { HexCoord } from './hex'
import type { KindStats, StructureDef, UpgradeTier } from './types'

export interface StructureInstance {
  def: StructureDef
  hex: HexCoord
  cooldown: number
  hp: number
  maxHp: number
  tierIndex: number
  forkId: string | null
  destroyed: boolean
  invested: number
  contributed: boolean
  sold: boolean
  disabled: number
}

export function createStructure(def: StructureDef, hex: HexCoord): StructureInstance {
  const base = def.tiers[0]
  const cd = base.kind === 'totem' ? base.totem.cooldown * 0.5 : 0
  return {
    def,
    hex: { ...hex },
    cooldown: cd,
    hp: def.hp,
    maxHp: def.hp,
    tierIndex: 0,
    forkId: null,
    destroyed: false,
    invested: def.cost,
    contributed: false,
    sold: false,
    disabled: 0
  }
}

export function currentTier(inst: StructureInstance): UpgradeTier {
  if (inst.forkId) {
    const tier = inst.def.tiers[inst.tierIndex]
    const fork = tier.forks?.find(f => f.id === inst.forkId)
    if (fork) return { ...fork }
  }
  return inst.def.tiers[inst.tierIndex]
}

export function kindStats(inst: StructureInstance): KindStats {
  const t = currentTier(inst)
  if (t.kind === 'cauldron') return { kind: 'cauldron', cauldron: t.cauldron }
  if (t.kind === 'totem') return { kind: 'totem', totem: t.totem }
  if (t.kind === 'grove') return { kind: 'grove', grove: t.grove }
  if (t.kind === 'ring') return { kind: 'ring', ring: t.ring }
  if (t.kind === 'idol') return { kind: 'idol', idol: t.idol }
  if (t.kind === 'well') return { kind: 'well', well: t.well }
  if (t.kind === 'mirror') return { kind: 'mirror', mirror: t.mirror }
  if (t.kind === 'eye') return { kind: 'eye', eye: t.eye }
  return { kind: 'wall' }
}
