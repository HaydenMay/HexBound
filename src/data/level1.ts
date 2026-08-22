import type { GameConfig } from '../sim/types'
import { WAVES } from './waves'

export function createLevelOneConfig(): GameConfig {
  return {
    cols: 26,
    rows: 18,
    entrance: { col: 0, row: 9 },
    ritual: { col: 13, row: 9 },
    waves: WAVES,
    startEssence: 160,
    startStability: 10
  }
}
