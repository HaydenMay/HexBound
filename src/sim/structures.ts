import type { HexCoord } from './hex'
import type { StructureDef } from './types'

export interface StructureInstance {
  def: StructureDef
  hex: HexCoord
  cooldown: number
}

export function createStructure(def: StructureDef, hex: HexCoord): StructureInstance {
  return {
    def,
    hex: { ...hex },
    cooldown: def.totem ? def.totem.cooldown * 0.5 : 0
  }
}
