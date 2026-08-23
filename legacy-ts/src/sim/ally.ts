import type { HexCoord } from './hex'

export class Ally {
  static nextId = 1
  readonly id: number
  remaining: number
  ownerId = ''
  attackCooldown = 0

  constructor(
    public dps: number,
    public duration: number,
    public attackRadius: number,
    public hex: HexCoord
  ) {
    this.id = Ally.nextId++
    this.remaining = duration
    this.hex = { ...hex }
  }
}
