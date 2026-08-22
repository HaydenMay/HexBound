import { neighbors, sameHex, type HexCoord } from './hex'
import type { BattlefieldGrid } from './grid'

export class FlowField {
  readonly dist: Float32Array

  constructor(private grid: BattlefieldGrid) {
    const n = grid.cols * grid.rows
    this.dist = new Float32Array(n).fill(Infinity)
    const visited = new Uint8Array(n)
    const start = grid.index(grid.ritual)
    this.dist[start] = 0

    for (;;) {
      let u = -1
      let best = Infinity
      for (let i = 0; i < n; i++) {
        if (!visited[i] && this.dist[i] < best) {
          best = this.dist[i]
          u = i
        }
      }
      if (u < 0) break
      visited[u] = 1
      const cur = grid.fromIndex(u)
      for (const nb of neighbors(cur)) {
        if (!grid.isWalkable(nb)) continue
        const ni = grid.index(nb)
        if (visited[ni]) continue
        const nd = best + 1 + grid.penaltyAt(nb)
        if (nd < this.dist[ni]) {
          this.dist[ni] = nd
        }
      }
    }
  }

  distanceAt(c: HexCoord): number {
    if (!this.grid.inBounds(c)) return Infinity
    return this.dist[this.grid.index(c)]
  }

  reachable(c: HexCoord): boolean {
    return Number.isFinite(this.distanceAt(c))
  }

  nextStep(c: HexCoord): HexCoord | null {
    if (sameHex(c, this.grid.ritual)) return null
    if (!this.reachable(c)) return null
    let best: HexCoord | null = null
    let bestDist = this.distanceAt(c)
    for (const nb of this.grid.neighborsInBounds(c)) {
      if (!this.grid.isWalkable(nb)) continue
      const d = this.distanceAt(nb)
      if (d < bestDist) {
        bestDist = d
        best = nb
      }
    }
    return best
  }
}
