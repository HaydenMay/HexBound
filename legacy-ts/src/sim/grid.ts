import { hexDistance, neighbors, type HexCoord } from './hex'

export interface PlacedStructure {
  defId: string
  hex: HexCoord
  blocksPath: boolean
}

export class BattlefieldGrid {
  readonly cols: number
  readonly rows: number
  readonly entrance: HexCoord
  readonly ritual: HexCoord
  private structures: (PlacedStructure | null)[]
  private penalty: Float32Array

  constructor(opts: { cols: number; rows: number; entrance: HexCoord; ritual: HexCoord }) {
    this.cols = opts.cols
    this.rows = opts.rows
    this.entrance = { ...opts.entrance }
    this.ritual = { ...opts.ritual }
    this.structures = new Array(opts.cols * opts.rows).fill(null)
    this.penalty = new Float32Array(opts.cols * opts.rows)
  }

  index(c: HexCoord): number {
    return c.row * this.cols + c.col
  }

  fromIndex(i: number): HexCoord {
    return { col: i % this.cols, row: Math.floor(i / this.cols) }
  }

  inBounds(c: HexCoord): boolean {
    return c.col >= 0 && c.col < this.cols && c.row >= 0 && c.row < this.rows
  }

  structureAt(c: HexCoord): PlacedStructure | null {
    if (!this.inBounds(c)) return null
    return this.structures[this.index(c)]
  }

  isWalkable(c: HexCoord): boolean {
    if (!this.inBounds(c)) return false
    const s = this.structures[this.index(c)]
    return !s || !s.blocksPath
  }

  placeable(c: HexCoord): boolean {
    if (!this.inBounds(c)) return false
    if (this.index(c) === this.index(this.ritual) || this.index(c) === this.index(this.entrance)) return false
    return this.structureAt(c) === null
  }

  setStructure(s: PlacedStructure): void {
    this.structures[this.index(s.hex)] = s
  }

  removeStructureAt(c: HexCoord): void {
    this.structures[this.index(c)] = null
  }

  penaltyAt(c: HexCoord): number {
    if (!this.inBounds(c)) return 0
    return this.penalty[this.index(c)]
  }

  resetPenalties(): void {
    this.penalty.fill(0)
  }

  addPenalty(center: HexCoord, radius: number, amount: number): void {
    for (let row = center.row - radius; row <= center.row + radius; row++) {
      for (let col = center.col - radius - 1; col <= center.col + radius + 1; col++) {
        const c = { col, row }
        if (!this.inBounds(c)) continue
        if (hexDistance(center, c) <= radius) {
          this.penalty[this.index(c)] += amount
        }
      }
    }
  }

  neighborsInBounds(c: HexCoord): HexCoord[] {
    return neighbors(c).filter(n => this.inBounds(n))
  }
}
