extends "res://tests/unit/test_sim_base.gd"

func test_has_every_neighbor_at_distance_1() -> void:
	for row in 12:
		for col in 12:
			var c := {"col": col, "row": row}
			for n in HexLib.neighbors(c):
				assert_eq(HexLib.hex_distance(c, n), 1)
				assert_eq(HexLib.hex_distance(n, c), 1)


func test_produces_six_unique_neighbors() -> void:
	var ns := HexLib.neighbors({"col": 3, "row": 4})
	assert_eq(ns.size(), 6)
	var keys := {}
	for n in ns:
		keys["%d,%d" % [n["col"], n["row"]]] = true
	assert_eq(keys.size(), 6)


func test_knows_known_distances() -> void:
	assert_eq(HexLib.hex_distance({"col": 0, "row": 0}, {"col": 1, "row": 0}), 1)
	assert_eq(HexLib.hex_distance({"col": 0, "row": 0}, {"col": 0, "row": 1}), 1)
	assert_eq(HexLib.hex_distance({"col": 0, "row": 0}, {"col": 2, "row": 1}), 3)
	var a := HexLib.hex_distance({"col": 0, "row": 0}, {"col": 5, "row": 5})
	assert_eq(a, HexLib.hex_distance({"col": 5, "row": 5}, {"col": 0, "row": 0}))


func test_round_trips_hex_to_world_and_back() -> void:
	for row in 18:
		for col in 26:
			var c := {"col": col, "row": row}
			var w := HexLib.hex_to_world(c)
			var back := HexLib.world_to_hex(w["x"], w["z"])
			if not HexLib.same_hex(c, back):
				fail_test("round trip failed for %s -> %s" % [str(c), str(back)])
				return
	pass_test("all round trips ok")
