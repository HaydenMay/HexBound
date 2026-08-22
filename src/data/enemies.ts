import type { EnemyDef } from '../sim/types'

export const ENEMY_DEFS: Record<string, EnemyDef> = {
  militia: {
    id: 'militia',
    name: 'Militia',
    hp: 40,
    speed: 1.1,
    reward: 8,
    ritualDamage: 1,
    scale: 1,
    color: 0xc05a4a
  },
  runner: {
    id: 'runner',
    name: 'Runner',
    hp: 22,
    speed: 2.1,
    reward: 6,
    ritualDamage: 1,
    scale: 0.7,
    color: 0xd9903f
  },
  knight: {
    id: 'knight',
    name: 'Knight',
    hp: 150,
    speed: 0.75,
    reward: 16,
    ritualDamage: 2,
    scale: 1.15,
    color: 0x8a94ad
  },
  priest: {
    id: 'priest',
    name: 'Priest',
    hp: 60,
    speed: 1.0,
    reward: 12,
    ritualDamage: 1,
    scale: 1,
    color: 0xf0e6c8,
    curseResist: 0.8,
    traitName: 'Blessed'
  },
  hunter: {
    id: 'hunter',
    name: 'Witch Hunter',
    hp: 55,
    speed: 1.25,
    reward: 12,
    ritualDamage: 1,
    scale: 0.9,
    color: 0xb04a6a,
    structureDamage: 10,
    traitName: 'Hexbreaker'
  },
  mage: {
    id: 'mage',
    name: 'Battle Mage',
    hp: 45,
    speed: 1.0,
    reward: 14,
    ritualDamage: 1,
    scale: 0.85,
    color: 0x7a9ff0,
    structureDamage: 7,
    structureRange: 3,
    targetsBlockingOnly: false,
    traitName: 'Battle Mage'
  }
}
