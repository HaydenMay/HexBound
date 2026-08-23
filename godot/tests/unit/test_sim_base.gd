extends GutTest

const DT := 1.0 / 30.0


func make_config(waves, overrides := {}) -> Dictionary:
	var c := {
		"cols": 7,
		"rows": 5,
		"entrance": {"col": 0, "row": 2},
		"ritual": {"col": 4, "row": 2},
		"waves": waves,
		"startEssence": 500.0,
		"startStability": 10
	}
	for k in overrides:
		c[k] = overrides[k]
	return c


func make_game(waves, overrides := {}, enemy_patches := {}) -> SimGame:
	var enemies := {}
	enemies.merge(EnemiesData.DEFS)
	for id in enemy_patches:
		var d: Dictionary = EnemiesData.DEFS[id].duplicate(true)
		d.merge(enemy_patches[id], true)
		enemies[id] = d
	var structures := {}
	structures.merge(StructuresData.DEFS)
	if overrides.has("structures"):
		for k in overrides["structures"]:
			structures[k] = overrides["structures"][k]
		overrides.erase("structures")
	return SimGame.new(make_config(waves, overrides), {"enemies": enemies, "structures": structures})


func step_for(game: SimGame, seconds: float) -> void:
	for i in int(round(seconds / DT)):
		game.update(DT)


func patched_structure(def_id: String, merges: Array) -> Dictionary:
	var d: Dictionary = StructuresData.DEFS[def_id].duplicate(true)
	for m in merges:
		var tier: Dictionary = d["tiers"][m[0]]
		tier[m[1]].merge(m[2], true)
	return d


func one_wave(wave: Dictionary, stability := 10) -> SimGame:
	return make_game([wave], {"startStability": stability})
