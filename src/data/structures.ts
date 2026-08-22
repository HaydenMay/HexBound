import type { StructureDef } from '../sim/types'

export const STRUCTURE_DEFS: Record<string, StructureDef> = {
  hexcauldron: {
    id: 'hexcauldron',
    name: 'Hex Cauldron',
    blurb: 'Brews a stacking curse on nearby foes.',
    cost: 40,
    blocksPath: true,
    hp: 90,
    color: 0x8cff9d,
    tiers: [
      {
        kind: 'cauldron',
        label: 'Simmering Brew',
        desc: 'Stacks a curse that burns over time.',
        cost: 0,
        radius: 2,
        cauldron: { dpsPerStack: 4, maxStacks: 5, stackInterval: 1, stackDuration: 4 }
      },
      {
        kind: 'cauldron',
        label: 'Thickened Brew',
        desc: 'Stronger curse. Then choose its final form.',
        cost: 45,
        radius: 2.5,
        cauldron: { dpsPerStack: 5, maxStacks: 6, stackInterval: 1, stackDuration: 4 },
        forks: [
          {
            id: 'plague',
            kind: 'cauldron',
            label: 'Plague',
            desc: 'The curse leaps to nearby foes when it takes hold.',
            cost: 70,
            radius: 3,
            cauldron: { dpsPerStack: 5, maxStacks: 6, stackInterval: 1, stackDuration: 4, spreadRadius: 1.5 }
          },
          {
            id: 'hemorrhage',
            kind: 'cauldron',
            label: 'Hemorrhage',
            desc: 'The longer a foe suffers, the faster the curse consumes them.',
            cost: 70,
            radius: 3,
            cauldron: { dpsPerStack: 5, maxStacks: 6, stackInterval: 1, stackDuration: 4, frenzyPerSec: 0.35 }
          }
        ]
      }
    ]
  },
  stormtotem: {
    id: 'stormtotem',
    name: 'Storm Totem',
    blurb: 'Lightning arcs between clustered enemies.',
    cost: 60,
    blocksPath: true,
    hp: 110,
    color: 0x9fd8ff,
    tiers: [
      {
        kind: 'totem',
        label: 'Crackling Totem',
        desc: 'Strikes the nearest foe; lightning jumps between packed targets.',
        cost: 0,
        radius: 3.5,
        totem: { damage: 14, maxTargets: 4, chainRange: 2, cooldown: 1.6 }
      },
      {
        kind: 'totem',
        label: 'Chained Storm',
        desc: 'Longer reach, heavier bolts, more jump targets.',
        cost: 55,
        radius: 4,
        totem: { damage: 18, maxTargets: 5, chainRange: 2.2, cooldown: 1.5 }
      },
      {
        kind: 'totem',
        label: 'Tempest',
        desc: 'The storm answers fully. Nothing clusters safely.',
        cost: 95,
        radius: 4.5,
        totem: { damage: 24, maxTargets: 6, chainRange: 2.4, cooldown: 1.4 }
      }
    ]
  },
  witchgate: {
    id: 'witchgate',
    name: 'Witch Gate',
    blurb: 'Hurls a foe backward along the road they came.',
    cost: 70,
    blocksPath: true,
    hp: 85,
    color: 0xd8aaff,
    tiers: [
      {
        kind: 'gate',
        label: 'Rift',
        desc: 'Periodically drags one enemy back down their own path.',
        cost: 0,
        radius: 2.5,
        gate: { steps: 10, cooldown: 7 }
      },
      {
        kind: 'gate',
        label: 'Widened Rift',
        desc: 'Reaches farther and drags them back farther still.',
        cost: 60,
        radius: 3,
        gate: { steps: 14, cooldown: 6 }
      },
      {
        kind: 'gate',
        label: 'The Long Way Home',
        desc: 'Sends them nearly back to where they started.',
        cost: 90,
        radius: 3.5,
        gate: { steps: 22, cooldown: 5 }
      }
    ]
  },
  thorngrove: {
    id: 'thorngrove',
    name: 'Thorn Grove',
    blurb: 'Briars foes refuse to cross. Bends their path without blocking it.',
    cost: 30,
    blocksPath: false,
    hp: 60,
    color: 0x6fd88f,
    tiers: [
      {
        kind: 'grove',
        label: 'Briar Patch',
        desc: 'Enemies detour around the thorns.',
        cost: 0,
        radius: 2,
        grove: { costPenalty: 4 }
      },
      {
        kind: 'grove',
        label: 'Deep Briars',
        desc: 'Denser thorns push routes harder.',
        cost: 35,
        radius: 2.5,
        grove: { costPenalty: 7 }
      },
      {
        kind: 'grove',
        label: 'Impenetrable Thicket',
        desc: 'Only the desperate cross here.',
        cost: 55,
        radius: 3,
        grove: { costPenalty: 12 }
      }
    ]
  },
  mushroomring: {
    id: 'mushroomring',
    name: 'Mushroom Ring',
    blurb: 'The fallen rise briefly as spiteful sprites.',
    cost: 65,
    blocksPath: false,
    hp: 75,
    color: 0x9dffce,
    tiers: [
      {
        kind: 'ring',
        label: 'Fairy Circle',
        desc: 'Foes who die within may return as allied sprites.',
        cost: 0,
        radius: 2,
        ring: { raiseChance: 0.35, duration: 8, dps: 6, attackRadius: 1.6, maxActive: 3 }
      },
      {
        kind: 'ring',
        label: 'Spore Bloom',
        desc: 'More sprites, angrier, lingering longer.',
        cost: 50,
        radius: 2.5,
        ring: { raiseChance: 0.5, duration: 10, dps: 8, attackRadius: 1.8, maxActive: 4 }
      },
      {
        kind: 'ring',
        label: 'Fungal Court',
        desc: 'A whole court of the risen fights for you.',
        cost: 80,
        radius: 3,
        ring: { raiseChance: 0.65, duration: 12, dps: 11, attackRadius: 2, maxActive: 5 }
      }
    ]
  },
  gazingorb: {
    id: 'gazingorb',
    name: 'Gazing Orb',
    blurb: 'Reveals the hidden nature of those who pass near.',
    cost: 35,
    blocksPath: true,
    hp: 70,
    color: 0xffe08a,
    tiers: [
      {
        kind: 'orb',
        label: 'Third Eye',
        desc: 'Unmasks special foes that wander close.',
        cost: 0,
        radius: 3
      },
      {
        kind: 'orb',
        label: 'Far Sight',
        desc: 'Its gaze reaches much farther.',
        cost: 30,
        radius: 4.5
      },
      {
        kind: 'orb',
        label: 'All-Seeing',
        desc: 'Few secrets survive crossing this ground.',
        cost: 45,
        radius: 6.5
      }
    ]
  }
}

export const STRUCTURE_ORDER = [
  'hexcauldron',
  'stormtotem',
  'witchgate',
  'thorngrove',
  'mushroomring',
  'gazingorb'
]
