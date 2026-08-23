import { writeFileSync, mkdirSync } from 'node:fs'
import { ENEMY_DEFS } from '../src/data/enemies.ts'
import { STRUCTURE_DEFS, STRUCTURE_ORDER } from '../src/data/structures.ts'
import { WAVES } from '../src/data/waves.ts'
import { LEVELS, FIELD_SIZES, applySize } from '../src/data/levels.ts'
import { createLevelOneConfig } from '../src/data/level1.ts'

const data = {
  fieldSizes: FIELD_SIZES,
  enemies: ENEMY_DEFS,
  structures: STRUCTURE_DEFS,
  structureOrder: STRUCTURE_ORDER,
  waves: WAVES,
  levels: LEVELS.map(l => ({ id: l.id, name: l.name, blurb: l.blurb, config: l.config })),
  levelOneConfig: createLevelOneConfig(),
  appliedConfigs: {}
}

for (let li = 0; li < LEVELS.length; li++) {
  for (const size of FIELD_SIZES) {
    data.appliedConfigs[`${li}:${size}`] = applySize(LEVELS[li].config, size)
  }
}

mkdirSync('godot/tests/fixtures', { recursive: true })
mkdirSync('godot/scripts/data', { recursive: true })
writeFileSync('godot/tests/fixtures/data.json', JSON.stringify(data))

const HEADER = '# GENERATED from TypeScript sources by tools/export-data.mjs - do not hand-edit.\n'
const lit = v => JSON.stringify(v, null, '\t')

writeFileSync(
  'godot/scripts/data/enemies_data.gd',
  `${HEADER}class_name EnemiesData\n\nconst DEFS := ${lit(ENEMY_DEFS)}\n`
)
writeFileSync(
  'godot/scripts/data/structures_data.gd',
  `${HEADER}class_name StructuresData\n\nconst DEFS := ${lit(STRUCTURE_DEFS)}\n\nconst ORDER := ${lit(STRUCTURE_ORDER)}\n`
)
writeFileSync(
  'godot/scripts/data/waves_data.gd',
  `${HEADER}class_name WavesData\n\nconst WAVES := ${lit(WAVES)}\n`
)

const levelsTail = `
const SIZE_FACTORS := {"small": 0.72, "large": 1.28}


static func apply_size(config: Dictionary, size: String) -> Dictionary:
	if size == "medium":
		return config
	assert(FIELD_SIZES.has(size))
	var f: float = SIZE_FACTORS[size]
	var cols: int = maxi(9, int(round(float(config["cols"]) * f)))
	var rows: int = maxi(5, int(round(float(config["rows"]) * f)))
	var mid_row := rows / 2
	var out: Dictionary = config.duplicate(true)
	out["cols"] = cols
	out["rows"] = rows
	out["entrance"] = {"col": 0, "row": mid_row}
	out["ritual"] = {"col": cols / 2, "row": mid_row}
	return out
`

writeFileSync(
  'godot/scripts/data/levels_data.gd',
  `${HEADER}class_name LevelsData\n\nconst FIELD_SIZES := ${lit(FIELD_SIZES)}\n\nconst LEVELS := ${lit(
    LEVELS.map(l => ({ id: l.id, name: l.name, blurb: l.blurb, config: l.config }))
  )}\n${levelsTail}`
)

console.log('wrote fixtures + 4 gdscript data modules')
