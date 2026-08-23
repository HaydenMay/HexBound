extends "res://tests/unit/test_sim_base.gd"

func test_charms_a_foe_holds_it_in_place_then_releases_it() -> void:
	var game := make_game([{"groups": [{"enemy": "militia", "count": 1, "interval": 1, "delay": 0}], "reward": 10}])
	game.place("whisperingidol", {"col": 2, "row": 1})
	var charmed := [false]
	game.events.on("enemyCharmed", func(_p):
		charmed[0] = true
	)
	game.start_wave()
	step_for(game, 6)
	assert_true(charmed[0])
	if not game.enemies.is_empty() and game.enemies[0].charmed_by != null:
		var e: SimEnemy = game.enemies[0]
		var pos := str(e.cur)
		step_for(game, 1)
		assert_eq(str(e.cur), pos)
	step_for(game, 12)
	if not game.enemies.is_empty():
		assert_eq(game.enemies[0].charmed_by, null)


func test_caps_concurrent_charms_per_idol() -> void:
	var game := make_game([{"groups": [{"enemy": "militia", "count": 4, "interval": 3, "delay": 0}], "reward": 10}])
	game.place("whisperingidol", {"col": 2, "row": 1})
	game.start_wave()
	step_for(game, 30)
	var idol_tier: Dictionary = StructuresData.DEFS["whisperingidol"]["tiers"][0]
	assert_eq(idol_tier["kind"], "idol")
	var charmed_count := 0
	for e in game.enemies:
		if e.charmed_by == "2,1":
			charmed_count += 1
	assert_lte(charmed_count, int(idol_tier["idol"]["concurrent"]))


func test_grants_essence_per_death_nearby() -> void:
	var game := make_game([{"groups": [{"enemy": "militia", "count": 1, "interval": 1, "delay": 0}], "reward": 0}])
	game.place("moonwell", {"col": 1, "row": 1})
	game.start_wave()
	step_for(game, 2)
	var well_tier: Dictionary = StructuresData.DEFS["moonwell"]["tiers"][0]
	assert_eq(well_tier["kind"], "well")
	var epd := float(well_tier["well"]["essencePerDeath"])
	var before: float = game.essence
	var enemy: SimEnemy = game.enemies[0]
	enemy.hp = 0
	step_for(game, 0.1)
	assert_eq(game.essence, before + float(EnemiesData.DEFS["militia"]["reward"]) + epd)


func test_sacrifices_the_nearest_ally_into_a_damaging_nova_and_respects_cooldown() -> void:
	var game := make_game([])
	game.place("moonwell", {"col": 2, "row": 2})
	var well: Dictionary = game.structure_at({"col": 2, "row": 2})
	game.allies.append(SimAlly.new(5.0, 99.0, 1.6, {"col": 1, "row": 2}))
	assert_true(game.sacrifice(well))
	assert_eq(game.allies.size(), 0)
	assert_gt(float(well["cooldown"]), 0.0)
	assert_false(game.sacrifice(well))


func test_nova_damages_enemies_around_the_well() -> void:
	var game := make_game([{"groups": [{"enemy": "militia", "count": 1, "interval": 1, "delay": 0}], "reward": 0}])
	game.place("moonwell", {"col": 2, "row": 2})
	var well: Dictionary = game.structure_at({"col": 2, "row": 2})
	game.start_wave()
	step_for(game, 0.4)
	var e: SimEnemy = game.enemies[0]
	e.cur = {"col": 2, "row": 2}
	e.next = null
	e.t = 0.0
	game.allies.append(SimAlly.new(5.0, 99.0, 1.6, {"col": 0, "row": 0}))
	var before: float = e.hp
	assert_true(game.sacrifice(well))
	assert_lt(e.hp, before)


func test_reflects_structure_damage_back_onto_the_attacker() -> void:
	var mirror_def := patched_structure("spellmirror", [[0, "mirror", {"reflectChance": 1.0}]])
	var game := make_game(
		[{"groups": [{"enemy": "hunter", "count": 1, "interval": 1, "delay": 0}], "reward": 10}],
		{"structures": {"spellmirror": mirror_def}},
		{"hunter": {"structureDamage": 50.0}}
	)
	for row in [0, 1, 3]:
		game.place("hexcauldron", {"col": 3, "row": row})
	game.place("spellmirror", {"col": 3, "row": 4})
	game.start_wave()
	step_for(game, 8)
	if game.enemies.is_empty():
		pass_test("hunter died before the reflection check")
	else:
		var reflected := false
		for e in game.enemies:
			if e.def["id"] == "hunter":
				reflected = e.hp <= 0.0 or e.hp < float(e.def["hp"])
		assert_true(reflected)


func test_does_not_double_emit_when_several_attackers_hit_the_same_wall() -> void:
	var game := make_game(
		[{"groups": [{"enemy": "hunter", "count": 3, "interval": 0.2, "delay": 0}], "reward": 0}],
		{},
		{"hunter": {"structureDamage": 300.0}}
	)
	var seen_list: Array = []
	game.events.on("structureDestroyed", func(s):
		seen_list.append("%d,%d" % [int(s["hex"]["col"]), int(s["hex"]["row"])])
	)
	for row in [0, 1, 3, 4]:
		game.place("hexcauldron", {"col": 3, "row": row})
	game.start_wave()
	step_for(game, 45)
	var unique := {}
	for k in seen_list:
		unique[k] = true
	assert_eq(unique.size(), seen_list.size())


func test_campaign_levels_are_valid() -> void:
	assert_eq(LevelsData.LEVELS.size(), 5)
	for i in LevelsData.LEVELS.size():
		var lvl: Dictionary = LevelsData.LEVELS[i]
		var game := SimGame.new(lvl["config"], {"enemies": EnemiesData.DEFS, "structures": StructuresData.DEFS})
		assert_true(game.field.reachable(game.grid.entrance), "level %d entrance reachable" % i)
		assert_gt((lvl["config"]["waves"] as Array).size(), 0)
