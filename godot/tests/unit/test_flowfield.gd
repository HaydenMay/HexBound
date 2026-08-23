extends "res://tests/unit/test_sim_base.gd"

func make_grid() -> BattlefieldGrid:
	return BattlefieldGrid.new({
		"cols": 7, "rows": 5,
		"entrance": {"col": 0, "row": 2},
		"ritual": {"col": 4, "row": 2}
	})


func test_reaches_every_cell_on_an_open_grid() -> void:
	var grid := make_grid()
	var field := FlowField.new(grid)
	for row in grid.rows:
		for col in grid.cols:
			if not field.reachable({"col": col, "row": row}):
				fail_test("unreachable %d,%d" % [col, row])
				return
	assert_gt(field.distance_at(grid.entrance), 0.0)
	assert_eq(field.distance_at(grid.ritual), 0.0)


func test_routes_around_a_wall_with_a_gap() -> void:
	var grid := make_grid()
	for row in [0, 1, 3, 4]:
		grid.set_structure({"defId": "test", "hex": {"col": 3, "row": row}, "blocksPath": true})
	var field := FlowField.new(grid)
	assert_true(field.reachable(grid.entrance))
	assert_gt(field.distance_at({"col": 3, "row": 2}), 0.0)
	assert_true(is_finite(field.distance_at(grid.entrance)))


func test_detects_a_fully_sealed_entrance() -> void:
	var grid := make_grid()
	for row in grid.rows:
		grid.set_structure({"defId": "test", "hex": {"col": 3, "row": row}, "blocksPath": true})
	var field := FlowField.new(grid)
	assert_false(field.reachable(grid.entrance))


func test_next_step_always_moves_downhill() -> void:
	var grid := make_grid()
	grid.set_structure({"defId": "test", "hex": {"col": 3, "row": 0}, "blocksPath": true})
	grid.set_structure({"defId": "test", "hex": {"col": 3, "row": 1}, "blocksPath": true})
	grid.set_structure({"defId": "test", "hex": {"col": 3, "row": 3}, "blocksPath": true})
	var field := FlowField.new(grid)
	var c: Dictionary = grid.entrance
	var steps := 0
	while steps < 100:
		var next = field.next_step(c)
		if next == null:
			break
		assert_lt(field.distance_at(next), field.distance_at(c))
		c = next
		steps += 1
		if int(c["col"]) == int(grid.ritual["col"]) and int(c["row"]) == int(grid.ritual["row"]):
			break
	assert_lt(steps, 100)
	assert_eq(int(c["col"]), int(grid.ritual["col"]))
	assert_eq(int(c["row"]), int(grid.ritual["row"]))


func test_penalties_raise_cost_without_disconnecting() -> void:
	var grid := make_grid()
	for row in grid.rows:
		grid.add_penalty({"col": 2, "row": row}, 0, 8.0)
	var field := FlowField.new(grid)
	assert_true(field.reachable(grid.entrance))
	var clean := FlowField.new(BattlefieldGrid.new({
		"cols": 7, "rows": 5,
		"entrance": {"col": 0, "row": 2},
		"ritual": {"col": 4, "row": 2}
	}))
	assert_gte(field.distance_at(grid.entrance), clean.distance_at(grid.entrance))
