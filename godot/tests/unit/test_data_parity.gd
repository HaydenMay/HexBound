extends GutTest

var data: Dictionary


func before_all() -> void:
	var f := FileAccess.open("res://tests/fixtures/data.json", FileAccess.READ)
	assert_not_null(f, "fixture file opens")
	data = JSON.parse_string(f.get_as_text())


func values_match(a, b) -> bool:
	if a is Dictionary and b is Dictionary:
		if a.size() != b.size():
			return false
		for k in a:
			if not b.has(k):
				return false
			if not values_match(a[k], b[k]):
				return false
		return true
	elif a is Array and b is Array:
		if a.size() != b.size():
			return false
		for i in a.size():
			if not values_match(a[i], b[i]):
				return false
		return true
	elif (a is float or a is int) and (b is float or b is int):
		return absf(float(a) - float(b)) < 0.000001
	else:
		return typeof(a) == typeof(b) and a == b


func assert_matches(actual, expected: Variant, label: String) -> void:
	if not values_match(actual, expected):
		fail_test("%s mismatch\n  gdscript: %s\n  fixture:  %s" % [label, var_to_str(actual), var_to_str(expected)])
	else:
		pass_test("%s matches" % label)


func test_field_sizes_parity() -> void:
	assert_matches(LevelsData.FIELD_SIZES, data["fieldSizes"], "FIELD_SIZES")


func test_enemies_parity() -> void:
	var defs: Dictionary = EnemiesData.DEFS
	assert_eq(defs.size(), (data["enemies"] as Dictionary).size(), "enemy count")
	for id in defs:
		assert_matches(defs[id], (data["enemies"] as Dictionary)[id], "enemy %s" % id)


func test_structures_parity() -> void:
	var defs: Dictionary = StructuresData.DEFS
	assert_eq(defs.size(), (data["structures"] as Dictionary).size(), "structure count")
	for id in defs:
		assert_matches(defs[id], (data["structures"] as Dictionary)[id], "structure %s" % id)


func test_structure_order_parity() -> void:
	assert_matches(StructuresData.ORDER, data["structureOrder"], "STRUCTURE_ORDER")


func test_waves_parity() -> void:
	assert_matches(WavesData.WAVES, data["waves"], "WAVES")


func test_levels_parity() -> void:
	var levels: Array = LevelsData.LEVELS
	assert_eq(levels.size(), (data["levels"] as Array).size(), "level count")
	for i in levels.size():
		assert_matches(levels[i], (data["levels"] as Array)[i], "level %d" % i)
	# NOTE: fixture's levelOneConfig is legacy createLevelOneConfig() - unrelated to
	# LEVELS[0] and unused by the campaign, so it is intentionally not ported.


func test_apply_size_parity_all_levels_all_sizes() -> void:
	var applied: Dictionary = data["appliedConfigs"]
	for key in applied:
		var parts := String(key).split(":")
		var li := int(parts[0])
		var size := parts[1]
		var base: Dictionary = LevelsData.LEVELS[li]["config"]
		var out := LevelsData.apply_size(base, size)
		assert_matches(out, applied[key], "applySize level %s size %s" % [str(li), size])
