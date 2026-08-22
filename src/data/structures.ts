import type { StructureDef } from '../sim/types'

export const STRUCTURE_DEFS: Record<string, StructureDef> = {
  bonepalisade: {
    id: 'bonepalisade',
    name: 'Bone Palisade',
    blurb: 'Cheap, dumb, and in the way. The maze piece.',
    cost: 12,
    blocksPath: true,
    hp: 70,
    color: 0xe8e2d0,
    structureTarget: true,
    tiers: [
      {
        kind: 'wall',
        label: 'Bone Fence',
        desc: 'A simple barrier of old bones. Hunters will hack it apart.',
        cost: 0,
        radius: 1
      },
      {
        kind: 'wall',
        label: 'Stacked Ribs',
        desc: 'Taller, denser, harder to smash through.',
        cost: 10,
        radius: 1,
        hp: 130
      },
      {
        kind: 'wall',
        label: 'Ossuary Bulwark',
        desc: 'A wall of the gathered dead. It holds.',
        cost: 18,
        radius: 1,
        hp: 200
      }
    ]
  },
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
  whisperingidol: {
    id: 'whisperingidol',
    name: 'Whispering Idol',
    blurb: 'Turns a foe against its own kin.',
    cost: 55,
    blocksPath: true,
    hp: 80,
    color: 0xc08aff,
    tiers: [
      {
        kind: 'idol',
        label: 'Soft Whisper',
        desc: 'Periodically charms one foe into fighting for you.',
        cost: 0,
        radius: 2.5,
        idol: { duration: 5, cooldown: 8, concurrent: 1 }
      },
      {
        kind: 'idol',
        label: 'Insistent Voice',
        desc: 'Longer charms, sooner.',
        cost: 50,
        radius: 3,
        idol: { duration: 7, cooldown: 6.5, concurrent: 1 }
      },
      {
        kind: 'idol',
        label: 'Choir of Whispers',
        desc: 'Two foes may turn at once.',
        cost: 85,
        radius: 3.5,
        idol: { duration: 9, cooldown: 5, concurrent: 2 }
      }
    ]
  },
  moonwell: {
    id: 'moonwell',
    name: 'Moonwell',
    blurb: 'Feeds on deaths nearby. Can detonate a sprite.',
    cost: 60,
    blocksPath: false,
    hp: 75,
    color: 0x8ad8ff,
    tiers: [
      {
        kind: 'well',
        label: 'Moonlit Pool',
        desc: 'Grants essence for each foe who dies near it. Sacrifice a sprite for a burst.',
        cost: 0,
        radius: 2.5,
        well: { essencePerDeath: 3, sacrificeDamage: 40, sacrificeRadius: 2.5, sacrificeCooldown: 12 }
      },
      {
        kind: 'well',
        label: 'Waxing Well',
        desc: 'Richer essence, harder bursts.',
        cost: 45,
        radius: 3,
        well: { essencePerDeath: 4, sacrificeDamage: 55, sacrificeRadius: 3, sacrificeCooldown: 10 }
      },
      {
        kind: 'well',
        label: 'Full Moon Rite',
        desc: 'The pool remembers everything.',
        cost: 70,
        radius: 3.5,
        well: { essencePerDeath: 6, sacrificeDamage: 75, sacrificeRadius: 3.5, sacrificeCooldown: 8 }
      }
    ]
  },
  spellmirror: {
    id: 'spellmirror',
    name: 'Spell Mirror',
    blurb: 'Tanky bait that returns aggression to the aggressor.',
    cost: 45,
    blocksPath: true,
    hp: 120,
    color: 0xf0f0ff,
    structureTarget: true,
    tiers: [
      {
        kind: 'mirror',
        label: 'Silvered Glass',
        desc: 'Chance to reflect structure attacks back onto the attacker.',
        cost: 0,
        radius: 1,
        mirror: { reflectChance: 0.35, reflectFactor: 1 }
      },
      {
        kind: 'mirror',
        label: 'Warded Glass',
        desc: 'Reflects more often, and harder.',
        cost: 35,
        radius: 1,
        mirror: { reflectChance: 0.5, reflectFactor: 1.25 }
      },
      {
        kind: 'mirror',
        label: 'Kaleidoscope',
        desc: 'Few survive striking it.',
        cost: 60,
        radius: 1,
        mirror: { reflectChance: 0.65, reflectFactor: 1.5 }
      }
    ]
  }
}

export const STRUCTURE_ORDER = [
  'bonepalisade',
  'hexcauldron',
  'stormtotem',
  'thorngrove',
  'mushroomring',
  'whisperingidol',
  'moonwell',
  'spellmirror'
]
