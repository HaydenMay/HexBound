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
  revealed = false
  history: HexCoord[] = []
  attackingHex: HexCoord | null = null

  constructor(readonly def: EnemyDef, spawn: HexCoord) {
    this.id = Enemy.nextId++
    this.hp = def.hp
    this.cur = { ...spawn }
  }

  remember(): void {
    this.history.unshift({ ...this.cur })
    if (this.history.length > 48) this.history.pop()
  }

  teleportBack(steps: number): HexCoord | null {
    if (!this.history.length) return null
    const idx = Math.min(Math.max(steps, 1), this.history.length) - 1
    const target = this.history[idx]
    this.history.splice(0, idx + 1)
    this.cur = { ...target }
    this.next = null
    this.t = 0
    return { ...target }
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
      this.remember()
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
