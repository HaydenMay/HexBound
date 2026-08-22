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
  }
}
