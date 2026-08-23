extends "res://tests/unit/test_sim_base.gd"

func _find_enemy(game: SimGame, id: String):
	for e in game.enemies:
		if e.def["id"] == id:
			return e
	return null


func test_paladin_cleanses_allies_but_never_itself() -> void:
	var game := make_game(
		[{"groups": [
			{"enemy": "militia", "count": 1, "interval": 1, "delay": 0},
			{"enemy": "paladin", "count": 1, "interval": 1, "delay": 0}
		], "reward": 0}],
		{},
		{
			"paladin": {"curseResist": 0.0, "speed": 0.05, "hp": 500.0},
			"militia": {"speed": 0.05, "hp": 500.0}
		}
	)
	game.place("hexcauldron", {"col": 1, "row": 1})
	game.start_wave()
	var guard := 0
	var t := 0.0
	while guard < 3000:
		var p = _find_enemy(game, "paladin")
		var a = _find_enemy(game, "militia")
		if p != null and a != null and p.poison_stacks > 0 and a.poison_stacks > 0:
			break
		game.update(DT)
		t += DT
		guard += 1
	assert_lt(t, 3.0)
	var pally: SimEnemy = _find_enemy(game, "paladin")
	var mil: SimEnemy = _find_enemy(game, "militia")
	assert_gt(pally.poison_stacks, 0)
	assert_gt(mil.poison_stacks, 0)
	var stacks_snapshot := pally.poison_stacks
	step_for(game, 3.8 - t)
	mil = _find_enemy(game, "militia")
	pally = _find_enemy(game, "paladin")
	assert_eq(mil.poison_stacks, 0)
	assert_eq(mil.poison_remaining, 0.0)
	assert_gte(pally.poison_stacks, stacks_snapshot)
	assert_gt(pally.poison_remaining, 0.0)


func test_silences_a_totem_then_the_totem_recovers() -> void:
	var game := make_game(
		[{"groups": [{"enemy": "inquisitor", "count": 1, "interval": 1, "delay": 0}], "reward": 0}],
		{},
		{"inquisitor": {"speed": 0.3, "structureDamage": 0.0}}
	)
	game.place("stormtotem", {"col": 2, "row": 1})
	game.start_wave()
	var saw_silenced := false
	var saw_recovered := false
	for i in int(round(14.0 / DT)):
		game.update(DT)
		var totem = game.structure_at({"col": 2, "row": 1})
		if totem == null:
			break
		if float(totem["disabled"]) > 0.0:
			saw_silenced = true
		elif saw_silenced:
			saw_recovered = true
	assert_true(saw_silenced)
	assert_true(saw_recovered)
	assert_true(game.structure_at({"col": 2, "row": 1}) != null)


func test_summons_extend_the_wave_beyond_the_original_spawn_list() -> void:
	var game := make_game(
		[{"groups": [{"enemy": "grandinquisitor", "count": 1, "interval": 1, "delay": 0}], "reward": 10}],
		{},
		{"grandinquisitor": {"speed": 0.25}}
	)
	var spawned := [0]
	game.events.on("enemySpawned", func(_p):
		spawned[0] += 1
	)
	var cleared_at: Array = []
	var elapsed := 0.0
	game.start_wave()
	for i in int(round(12.0 / DT)):
		game.update(DT)
		elapsed += DT
		if cleared_at.is_empty() and game.phase != "active":
			cleared_at.append(elapsed)
	assert_gte(spawned[0], 4)
	if not cleared_at.is_empty():
		assert_gt(cleared_at[0], 7.0)
	else:
		assert_eq(game.phase, "active")


func test_idol_never_charms_an_inquisitor() -> void:
	var game := make_game(
		[{"groups": [{"enemy": "inquisitor", "count": 1, "interval": 1, "delay": 0}], "reward": 0}],
		{},
		{"inquisitor": {"structureDamage": 0.0}}
	)
	game.place("whisperingidol", {"col": 2, "row": 1})
	var charmed_any := [false]
	game.events.on("enemyCharmed", func(_p):
		charmed_any[0] = true
	)
	game.start_wave()
	step_for(game, 12)
	assert_false(charmed_any[0])
	for e in game.enemies:
		assert_eq(e.charmed_by, null)


func test_refunds_fully_in_building_phase_but_is_sealed_once_foes_march() -> void:
	var game := make_game([])
	game.place("bonepalisade", {"col": 1, "row": 1})
	var first: Dictionary = game.structure_at({"col": 1, "row": 1})
	assert_eq(game.sell_structure(first), int(StructuresData.DEFS["bonepalisade"]["cost"]))
	assert_eq(game.structure_at({"col": 1, "row": 1}), null)

	game.place("bonepalisade", {"col": 2, "row": 1})
	var second: Dictionary = game.structure_at({"col": 2, "row": 1})
	game.phase = "active"
	assert_eq(game.sell_structure(second), 0)
	assert_eq(game.structure_at({"col": 2, "row": 1}), second)


func test_eye_amps_weakness_shock_inside_and_none_outside() -> void:
	var game := make_game([{"groups": [{"enemy": "knight", "count": 2, "interval": 0.1, "delay": 0}], "reward": 0}])
	game.place("watchingeye", {"col": 1, "row": 2})
	game.start_wave()
	step_for(game, 0.5)
	assert_eq(game.enemies.size(), 2)
	var inside: SimEnemy = game.enemies[0]
	var outside: SimEnemy = game.enemies[1]
	inside.cur = {"col": 2, "row": 2}
	inside.next = null
	inside.t = 0.0
	outside.cur = {"col": 6, "row": 2}
	outside.next = null
	outside.t = 0.0

	var inside_before: float = inside.hp
	game.damage_enemy(inside, 100.0, "shock")
	assert_almost_eq(inside.hp, inside_before - 115.0, 0.001)

	var outside_before: float = outside.hp
	game.damage_enemy(outside, 100.0, "shock")
	assert_eq(outside.hp, outside_before - 100.0)

	var burst_target: SimEnemy = game.enemies[0]
	var burst_before: float = burst_target.hp
	game.damage_enemy(burst_target, 100.0, "burst")
	assert_eq(burst_target.hp, burst_before - 100.0)


func test_scouting_reveals_each_foe_type_and_remembers_after_death() -> void:
	var game := make_game([{"groups": [
		{"enemy": "militia", "count": 1, "interval": 1, "delay": 0},
		{"enemy": "runner", "count": 1, "interval": 1, "delay": 0}
	], "reward": 0}])
	game.place("watchingeye", {"col": 1, "row": 2})
	game.start_wave()
	step_for(game, 14)
	assert_eq(game.phase, "won")
	assert_eq(game.enemies.size(), 0)
	assert_true(game.scouted.has("militia"))
	assert_true(game.scouted.has("runner"))
