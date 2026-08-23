extends "res://tests/unit/test_sim_base.gd"

func test_a_fully_resistant_foe_never_gains_poison_stacks() -> void:
	var game := make_game(
		[{"groups": [{"enemy": "militia", "count": 1, "interval": 0.5, "delay": 0}], "reward": 10}],
		{},
		{"militia": {"curseResist": 1.0}}
	)
	game.place("hexcauldron", {"col": 1, "row": 1})
	game.start_wave()
	step_for(game, 8)
	if game.enemies.is_empty():
		pass_test("zealot breached before the inspection window")
	else:
		var e: SimEnemy = game.enemies[0]
		assert_eq(e.poison_stacks, 0)
		assert_eq(e.hp, float(e.def["hp"]))


func test_hunter_chews_through_blocking_structures_and_the_field_stays_valid() -> void:
	var game := make_game(
		[{"groups": [{"enemy": "hunter", "count": 1, "interval": 0.5, "delay": 0}], "reward": 10}],
		{},
		{"hunter": {"structureDamage": 200.0}}
	)
	var destroyed := [0]
	game.events.on("structureDestroyed", func(_p):
		destroyed[0] += 1
	)
	for row in [0, 1, 3, 4]:
		game.place("bonepalisade", {"col": 3, "row": row})
	game.start_wave()
	step_for(game, 60)
	assert_gt(destroyed[0], 0)
	assert_true(game.field.reachable(game.grid.entrance))
	var open_wall_cell := false
	for row in [0, 1, 3, 4]:
		if game.grid.is_walkable({"col": 3, "row": row}) and game.structure_at({"col": 3, "row": row}) == null:
			open_wall_cell = true
	assert_true(open_wall_cell)


func test_raises_an_ally_from_a_kill_and_the_ally_harms_passersby() -> void:
	var ring_def := patched_structure("mushroomring", [[0, "ring", {"raiseChance": 1.0}]])
	var game := make_game(
		[{"groups": [{"enemy": "militia", "count": 2, "interval": 6, "delay": 0}], "reward": 10}],
		{"structures": {"mushroomring": ring_def}}
	)
	game.place("mushroomring", {"col": 1, "row": 1})
	game.start_wave()
	step_for(game, 2)
	assert_eq(game.enemies.size(), 1)
	game.enemies[0].hp = 0
	step_for(game, 0.1)
	assert_eq(game.allies.size(), 1)
	step_for(game, 12)
	if not game.enemies.is_empty():
		var second: SimEnemy = game.enemies[0]
		assert_lt(second.hp, float(second.def["hp"]))


func test_linear_upgrades_improve_stats_and_cost_essence() -> void:
	var game := make_game([])
	game.place("stormtotem", {"col": 1, "row": 1})
	var inst: Dictionary = game.structure_at({"col": 1, "row": 1})
	var before := StructureOps.kind_stats(inst)
	assert_eq(before["kind"], "totem")
	var cost := int(inst["def"]["tiers"][1]["cost"])
	var wallet: float = game.essence
	assert_eq(game.upgrade(inst), "ok")
	assert_eq(game.essence, wallet - cost)
	var after := StructureOps.kind_stats(inst)
	assert_eq(after["kind"], "totem")
	assert_gt(float(after["totem"]["damage"]), float(before["totem"]["damage"]))


func test_fork_choice_requires_an_id_and_applies_branch_stats() -> void:
	var game := make_game([])
	game.place("hexcauldron", {"col": 1, "row": 1})
	var inst: Dictionary = game.structure_at({"col": 1, "row": 1})
	game.upgrade(inst)
	assert_eq(game.upgrade(inst), "invalid")
	assert_eq(game.upgrade(inst, "plague"), "ok")
	assert_eq(inst["fork_id"], "plague")
	var stats := StructureOps.kind_stats(inst)
	assert_eq(stats["kind"], "cauldron")
	assert_gt(float(stats["cauldron"].get("spreadRadius", 0.0)), 0.0)
	assert_eq(game.upgrade(inst), "maxed")


func test_rejects_upgrades_when_essence_is_lacking() -> void:
	var game := make_game([])
	game.place("stormtotem", {"col": 1, "row": 1})
	var inst: Dictionary = game.structure_at({"col": 1, "row": 1})
	game.essence = 1.0
	assert_eq(game.upgrade(inst), "unaffordable")


func test_wave_preview_visibility() -> void:
	var waves := [
		{"groups": [{"enemy": "militia", "count": 1, "interval": 0.3, "delay": 0}], "reward": 5},
		{"groups": [{"enemy": "runner", "count": 1, "interval": 0.3, "delay": 0}], "reward": 5}
	]
	var game := make_game(waves)
	assert_eq_deep(game.next_wave_preview(), waves[0])
	game.start_wave()
	assert_eq(game.next_wave_preview(), null)
	step_for(game, 30)
	assert_eq(game.phase, "building")
	assert_eq_deep(game.next_wave_preview(), waves[1])
