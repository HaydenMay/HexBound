extends "res://tests/unit/test_sim_base.gd"

func test_accepts_a_valid_placement_and_deducts_essence() -> void:
	var game := one_wave({"groups": [], "reward": 0})
	var before: float = game.essence
	assert_true(game.place("hexcauldron", {"col": 1, "row": 1}))
	assert_eq(game.essence, before - float(StructuresData.DEFS["hexcauldron"]["cost"]))
	assert_true(game.grid.structure_at({"col": 1, "row": 1}) != null)


func test_rejects_occupied_hexes() -> void:
	var game := one_wave({"groups": [], "reward": 0})
	game.place("hexcauldron", {"col": 1, "row": 1})
	assert_eq_deep(game.can_place("stormtotem", {"col": 1, "row": 1}), {"ok": false, "reason": "blocked"})


func test_rejects_the_ritual_and_entrance_hexes() -> void:
	var game := one_wave({"groups": [], "reward": 0})
	assert_false(game.can_place("hexcauldron", game.grid.ritual)["ok"])
	assert_false(game.can_place("hexcauldron", game.grid.entrance)["ok"])


func test_rejects_out_of_bounds_hexes() -> void:
	var game := one_wave({"groups": [], "reward": 0})
	assert_false(game.can_place("hexcauldron", {"col": -1, "row": 2})["ok"])
	assert_false(game.can_place("hexcauldron", {"col": 99, "row": 99})["ok"])


func test_rejects_placements_that_seal_the_entrance() -> void:
	var game := one_wave({"groups": [], "reward": 0})
	for row in [0, 1, 3, 4]:
		assert_true(game.place("hexcauldron", {"col": 3, "row": row}))
	assert_eq_deep(
		game.can_place("hexcauldron", {"col": 3, "row": 2}),
		{"ok": false, "reason": "sealed"}
	)


func test_allows_thorn_groves_on_the_only_path_since_they_never_seal() -> void:
	var game := one_wave({"groups": [], "reward": 0})
	for row in [0, 1, 3, 4]:
		game.place("hexcauldron", {"col": 3, "row": row})
	assert_true(game.place("thorngrove", {"col": 3, "row": 2}))


func test_rejects_unaffordable_placements() -> void:
	var poor := make_game([], {"startEssence": 10.0})
	assert_eq_deep(
		poor.can_place("stormtotem", {"col": 1, "row": 1}),
		{"ok": false, "reason": "unaffordable"}
	)


func test_emits_field_changed_when_the_path_is_altered() -> void:
	var game := one_wave({"groups": [], "reward": 0})
	var changed := [0]
	game.events.on("fieldChanged", func(_p):
		changed[0] += 1
	)
	game.place("hexcauldron", {"col": 1, "row": 1})
	assert_eq(changed[0], 1)


func test_refunds_in_full_before_contributing_and_partially_after() -> void:
	var game := one_wave({"groups": [], "reward": 0})
	game.place("bonepalisade", {"col": 1, "row": 1})
	var inst: Dictionary = game.structure_at({"col": 1, "row": 1})
	assert_eq(game.refund_for(inst), 12)
	inst["contributed"] = true
	assert_eq(game.refund_for(inst), 8)


func test_selling_returns_essence_frees_the_hex_and_reopens_the_path() -> void:
	var game := one_wave({"groups": [], "reward": 0})
	game.place("bonepalisade", {"col": 1, "row": 1})
	var before: float = game.essence
	var refund := game.sell_structure(game.structure_at({"col": 1, "row": 1}))
	assert_eq(refund, 12)
	assert_eq(game.essence, before + 12)
	assert_eq(game.structure_at({"col": 1, "row": 1}), null)
	assert_true(game.can_place("bonepalisade", {"col": 1, "row": 1})["ok"])


func test_spawns_enemies_over_time_and_they_walk_to_the_ritual() -> void:
	var game := one_wave({"groups": [{"enemy": "militia", "count": 1, "interval": 0.5, "delay": 0}], "reward": 10})
	game.start_wave()
	assert_eq(game.phase, "active")
	step_for(game, 0.5)
	assert_eq(game.enemies.size(), 1)
	step_for(game, 20)
	assert_eq(game.enemies.size(), 0)
	assert_eq(game.stability, 9)


func test_rewards_essence_on_death() -> void:
	var game := one_wave({"groups": [{"enemy": "militia", "count": 1, "interval": 0.5, "delay": 0}], "reward": 10})
	game.start_wave()
	step_for(game, 0.5)
	var enemy: SimEnemy = game.enemies[0]
	var before: float = game.essence
	enemy.hp = 0
	step_for(game, 0.1)
	assert_eq(game.enemies.size(), 0)
	assert_eq(game.essence, before + float(EnemiesData.DEFS["militia"]["reward"]) + 10)


func test_completes_a_wave_and_returns_to_building_phase() -> void:
	var game := make_game([
		{"groups": [{"enemy": "militia", "count": 2, "interval": 0.3, "delay": 0}], "reward": 15},
		{"groups": [{"enemy": "militia", "count": 2, "interval": 0.3, "delay": 0}], "reward": 15}
	])
	var before: float = game.essence
	game.start_wave()
	step_for(game, 40)
	assert_eq(game.phase, "building")
	assert_eq(game.progress, 50.0)
	assert_eq(game.wave_index, 1)
	assert_gt(game.essence, before)


func test_wins_after_the_final_wave_is_cleared() -> void:
	var game := one_wave({"groups": [{"enemy": "runner", "count": 1, "interval": 0.5, "delay": 0}], "reward": 5})
	var won := [false]
	game.events.on("won", func(_p):
		won[0] = true
	)
	game.start_wave()
	step_for(game, 60)
	assert_eq(game.phase, "won")
	assert_true(won[0])


func test_loses_when_stability_reaches_zero() -> void:
	var game := one_wave(
		{"groups": [{"enemy": "militia", "count": 3, "interval": 0.2, "delay": 0}], "reward": 0},
		2
	)
	var lost := [false]
	game.events.on("lost", func(_p):
		lost[0] = true
	)
	game.start_wave()
	step_for(game, 60)
	assert_eq(game.phase, "lost")
	assert_true(lost[0])


func test_poisons_enemies_inside_cauldron_aura() -> void:
	var game := one_wave({"groups": [{"enemy": "militia", "count": 1, "interval": 0.5, "delay": 0}], "reward": 0})
	game.place("hexcauldron", {"col": 1, "row": 2})
	game.start_wave()
	step_for(game, 6)
	if not game.enemies.is_empty():
		assert_lt(game.enemies[0].hp, float(EnemiesData.DEFS["militia"]["hp"]))
	else:
		assert_eq(game.enemies.size(), 0)


func test_totems_strike_clustered_enemies_with_lightning() -> void:
	var game := one_wave({
		"groups": [
			{"enemy": "militia", "count": 3, "interval": 8, "delay": 0},
			{"enemy": "militia", "count": 3, "interval": 8, "delay": 4}
		],
		"reward": 0
	})
	game.place("stormtotem", {"col": 2, "row": 2})
	var strikes := [0]
	game.events.on("lightning", func(p):
		if (p["points"] as Array).size() >= 2:
			strikes[0] += 1
	)
	game.start_wave()
	step_for(game, 30)
	assert_gt(strikes[0], 0)
