import type { HexCoord } from './hex'
import type { EnemyDef } from './types'

export class Enemy {
  static nextId = 1
  readonly id: number
  hp: number
  cur: HexCoord
  next: HexCoord | null = null
  t = 0
  poisonStacks = 0
  poisonRemaining = 0
  poisonedTime = 0
  stackProgress = 0
  inAura = false
  attackingHex: HexCoord | null = null
  charmedBy: string | null = null
  charmRemaining = 0
  vfxClock = 0

  constructor(readonly def: EnemyDef, spawn: HexCoord) {
    this.id = Enemy.nextId++
    this.hp = def.hp
    this.cur = { ...spawn }
  }

  tickEffects(dt: number): void {
    if (this.poisonRemaining > 0) {
      this.poisonRemaining -= dt
      if (this.poisonRemaining <= 0) {
        this.poisonStacks = 0
        this.stackProgress = 0
      }
    }
  }

  advance(dt: number, nextStep: (c: HexCoord) => HexCoord | null): 'walking' | 'arrived' {
    if (!this.next) {
      const n = nextStep(this.cur)
      if (!n) return 'arrived'
      this.next = n
    }
    this.t += this.def.speed * dt
    if (this.t >= 1) {
      this.cur = this.next
      this.next = null
      this.t = 0
    }
    return 'walking'
  }
}
