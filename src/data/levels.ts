import type { GameConfig, WaveDef } from '../sim/types'

function wave(enemy: string, count: number, interval: number, delay: number): WaveDef['groups'][number] {
  return { enemy, count, interval, delay }
}

function w(groups: WaveDef['groups'], reward: number): WaveDef {
  return { groups, reward }
}

export interface LevelDef {
  id: string
  name: string
  blurb: string
  config: GameConfig
}

export type FieldSize = 'small' | 'medium' | 'large'

export const FIELD_SIZES: FieldSize[] = ['small', 'medium', 'large']

const SIZE_FACTOR: Record<FieldSize, number> = { small: 0.72, medium: 1, large: 1.28 }

export function applySize(config: GameConfig, size: FieldSize): GameConfig {
  if (size === 'medium') return config
  const f = SIZE_FACTOR[size]
  const cols = Math.max(9, Math.round(config.cols * f))
  const rows = Math.max(5, Math.round(config.rows * f))
  const midRow = Math.floor(rows / 2)
  return {
    ...config,
    cols,
    rows,
    entrance: { col: 0, row: midRow },
    ritual: { col: Math.floor(cols / 2), row: midRow }
  }
}

export const LEVELS: LevelDef[] = [
  {
    id: 'l1',
    name: 'First Circle',
    blurb: 'A small rite under a curious moon.',
    config: {
      cols: 11,
      rows: 7,
      entrance: { col: 0, row: 3 },
      ritual: { col: 5, row: 3 },
      startEssence: 150,
      startStability: 10,
      waves: [
        w([wave('militia', 6, 1.4, 1)], 20),
        w([wave('militia', 9, 1.2, 1), wave('runner', 4, 1.4, 5)], 26),
        w([wave('knight', 2, 3.5, 2), wave('militia', 8, 1.1, 1)], 32),
        w([wave('hunter', 2, 2.5, 2), wave('militia', 10, 0.9, 1), wave('runner', 8, 1.0, 6)], 40)
      ]
    }
  },
  {
    id: 'l2',
    name: "Hunter's Vigil",
    blurb: 'They come to break your walls.',
    config: {
      cols: 13,
      rows: 9,
      entrance: { col: 0, row: 4 },
      ritual: { col: 6, row: 4 },
      startEssence: 160,
      startStability: 10,
      waves: [
        w([wave('militia', 8, 1.2, 1)], 22),
        w([wave('hunter', 3, 2.2, 2), wave('militia', 8, 1.1, 1)], 30),
        w([wave('knight', 3, 3, 2), wave('runner', 8, 1.0, 5)], 34),
        w([wave('hunter', 4, 1.8, 2), wave('militia', 12, 0.9, 1), wave('priest', 2, 3, 10)], 42),
        w([wave('knight', 4, 2.5, 2), wave('hunter', 4, 1.6, 6), wave('runner', 10, 0.8, 3)], 55)
      ]
    }
  },
  {
    id: 'l3',
    name: 'Blessed March',
    blurb: 'Priests march at their front.',
    config: {
      cols: 15,
      rows: 10,
      entrance: { col: 0, row: 5 },
      ritual: { col: 7, row: 5 },
      startEssence: 170,
      startStability: 10,
      waves: [
        w([wave('militia', 8, 1.1, 1), wave('priest', 2, 2.5, 3)], 24),
        w([wave('priest', 4, 2, 2), wave('runner', 10, 0.9, 4)], 32),
        w([wave('knight', 5, 2.2, 2), wave('paladin', 2, 3, 4), wave('priest', 3, 2.5, 8)], 38),
        w([wave('hunter', 5, 1.6, 2), wave('militia', 14, 0.8, 1)], 46),
        w([wave('priest', 5, 1.8, 1), wave('paladin', 3, 3.5, 4), wave('knight', 5, 2.2, 5), wave('runner', 12, 0.7, 8)], 60)
      ]
    }
  },
  {
    id: 'l4',
    name: 'Arcane Purge',
    blurb: 'Battle mages unmake your works from afar.',
    config: {
      cols: 17,
      rows: 11,
      entrance: { col: 0, row: 5 },
      ritual: { col: 8, row: 5 },
      startEssence: 180,
      startStability: 12,
      waves: [
        w([wave('mage', 3, 2.5, 2), wave('militia', 10, 1.0, 1)], 28),
        w([wave('mage', 4, 2.2, 2), wave('knight', 4, 2.4, 5)], 36),
        w([wave('priest', 4, 2, 2), wave('mage', 4, 2, 7)], 44),
        w([wave('mage', 6, 1.8, 2), wave('hunter', 5, 1.6, 6), wave('inquisitor', 1, 1, 7)], 52),
        w([wave('knight', 6, 2, 2), wave('mage', 5, 1.8, 8), wave('runner', 14, 0.7, 4), wave('inquisitor', 2, 5, 9)], 66)
      ]
    }
  },
  {
    id: 'l5',
    name: 'The Grand Assault',
    blurb: 'Everything they have, all at once.',
    config: {
      cols: 19,
      rows: 12,
      entrance: { col: 0, row: 6 },
      ritual: { col: 9, row: 6 },
      startEssence: 200,
      startStability: 12,
      waves: [
        w([wave('militia', 12, 0.9, 1), wave('runner', 8, 1.0, 5)], 30),
        w([wave('knight', 5, 2.2, 2), wave('paladin', 2, 3, 5), wave('priest', 3, 2.4, 6)], 38),
        w([wave('hunter', 6, 1.5, 2), wave('mage', 4, 2, 7), wave('militia', 14, 0.8, 1)], 48),
        w([wave('priest', 6, 1.7, 1), wave('runner', 16, 0.7, 5), wave('inquisitor', 2, 6, 6)], 56),
        w([wave('knight', 8, 1.8, 2), wave('mage', 6, 1.7, 8)], 64),
        w([wave('grandinquisitor', 1, 1, 6), wave('hunter', 8, 1.3, 2), wave('priest', 6, 1.7, 7), wave('militia', 18, 0.6, 1)], 74),
        w([wave('knight', 10, 1.6, 2), wave('runner', 20, 0.6, 6), wave('mage', 8, 1.5, 12)], 88),
        w([wave('militia', 24, 0.5, 1), wave('knight', 10, 1.5, 4), wave('hunter', 8, 1.3, 10), wave('mage', 8, 1.4, 14), wave('priest', 6, 1.6, 18), wave('grandinquisitor', 2, 15, 20)], 120)
      ]
    }
  }
]
