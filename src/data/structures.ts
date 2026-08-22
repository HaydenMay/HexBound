import type { StructureDef } from '../sim/types'

export const STRUCTURE_DEFS: Record<string, StructureDef> = {
  hexcauldron: {
    id: 'hexcauldron',
    name: 'Hex Cauldron',
    blurb: 'Brews a stacking curse on nearby foes.',
    cost: 40,
    blocksPath: true,
    auraRadius: 2,
    kind: 'cauldron',
    cauldron: { dpsPerStack: 4, maxStacks: 5, stackInterval: 1, stackDuration: 4 }
  },
  stormtotem: {
    id: 'stormtotem',
    name: 'Storm Totem',
    blurb: 'Lightning arcs between clustered enemies.',
    cost: 60,
    blocksPath: true,
    auraRadius: 3.5,
    kind: 'totem',
    totem: { damage: 14, maxTargets: 4, range: 3.5, chainRange: 2, cooldown: 1.6 }
  },
  thorngrove: {
    id: 'thorngrove',
    name: 'Thorn Grove',
    blurb: 'Briars foes refuse to cross. Bends their path without blocking it.',
    cost: 30,
    blocksPath: false,
    auraRadius: 2,
    kind: 'grove',
    grove: { penaltyRadius: 2, costPenalty: 4 }
  }
}

export const STRUCTURE_ORDER = ['hexcauldron', 'stormtotem', 'thorngrove']
