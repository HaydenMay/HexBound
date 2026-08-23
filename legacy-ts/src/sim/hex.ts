export interface HexCoord {
  col: number
  row: number
}

export interface WorldPos {
  x: number
  z: number
}

export const HEX_SIZE = 1
const SQRT3 = Math.sqrt(3)

const EVEN_ROW_DELTAS: HexCoord[] = [
  { col: 1, row: 0 },
  { col: -1, row: 0 },
  { col: 0, row: -1 },
  { col: -1, row: -1 },
  { col: 0, row: 1 },
  { col: -1, row: 1 }
]

const ODD_ROW_DELTAS: HexCoord[] = [
  { col: 1, row: 0 },
  { col: -1, row: 0 },
  { col: 1, row: -1 },
  { col: 0, row: -1 },
  { col: 1, row: 1 },
  { col: 0, row: 1 }
]

export function neighbors(c: HexCoord): HexCoord[] {
  const deltas = c.row & 1 ? ODD_ROW_DELTAS : EVEN_ROW_DELTAS
  return deltas.map(d => ({ col: c.col + d.col, row: c.row + d.row }))
}

interface Cube {
  x: number
  y: number
  z: number
}

function offsetToCube(c: HexCoord): Cube {
  const x = c.col - (c.row - (c.row & 1)) / 2
  const z = c.row
  return { x, y: -x - z, z }
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  const ca = offsetToCube(a)
  const cb = offsetToCube(b)
  return (Math.abs(ca.x - cb.x) + Math.abs(ca.y - cb.y) + Math.abs(ca.z - cb.z)) / 2
}

export function sameHex(a: HexCoord, b: HexCoord): boolean {
  return a.col === b.col && a.row === b.row
}

export function hexToWorld(c: HexCoord): WorldPos {
  return {
    x: SQRT3 * (c.col + 0.5 * (c.row & 1)) * HEX_SIZE,
    z: 1.5 * c.row * HEX_SIZE
  }
}

export function lerpHexToWorld(a: HexCoord, b: HexCoord | null, t: number): WorldPos {
  const pa = hexToWorld(a)
  if (!b) return pa
  const pb = hexToWorld(b)
  return {
    x: pa.x + (pb.x - pa.x) * t,
    z: pa.z + (pb.z - pa.z) * t
  }
}

function cubeRound(q: number, r: number): Cube {
  const s = -q - r
  let rq = Math.round(q)
  let rr = Math.round(r)
  const rs = Math.round(s)
  const dq = Math.abs(rq - q)
  const dr = Math.abs(rr - r)
  const ds = Math.abs(rs - s)
  if (dq > dr && dq > ds) {
    rq = -rr - rs
  } else if (dr > ds) {
    rr = -rq - rs
  }
  return { x: rq, y: -rq - rr, z: rr }
}

export function worldToHex(x: number, z: number): HexCoord {
  const q = ((SQRT3 / 3) * x - (1 / 3) * z) / HEX_SIZE
  const r = ((2 / 3) * z) / HEX_SIZE
  const cube = cubeRound(q, r)
  return {
    col: cube.x + (cube.z - (cube.z & 1)) / 2,
    row: cube.z
  }
}
