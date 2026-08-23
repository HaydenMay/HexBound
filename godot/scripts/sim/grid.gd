class_name BattlefieldGrid
extends RefCounted

var cols: int
var rows: int
var entrance: Dictionary
var ritual: Dictionary
var structures: Array = []
var penalty := PackedFloat32Array()


func _init(config: Dictionary) -> void:
	cols = int(config["cols"])
	rows = int(config["rows"])
	entrance = {"col": config["entrance"]["col"], "row": config["entrance"]["row"]}
	ritual = {"col": config["ritual"]["col"], "row": config["ritual"]["row"]}
	structures.resize(cols * rows)
	for i in cols * rows:
		structures[i] = null
	penalty.resize(cols * rows)
	penalty.fill(0.0)


func index(c: Dictionary) -> int:
	return int(c["row"]) * cols + int(c["col"])


func from_index(i: int) -> Dictionary:
	return {"col": i % cols, "row": i / cols}


func in_bounds(c: Dictionary) -> bool:
	return int(c["col"]) >= 0 and int(c["col"]) < cols and int(c["row"]) >= 0 and int(c["row"]) < rows


func structure_at(c: Dictionary):
	if not in_bounds(c):
		return null
	return structures[index(c)]


func is_walkable(c: Dictionary) -> bool:
	if not in_bounds(c):
		return false
	var s = structures[index(c)]
	return s == null or not s["blocksPath"]


func placeable(c: Dictionary) -> bool:
	if not in_bounds(c):
		return false
	if index(c) == index(ritual) or index(c) == index(entrance):
		return false
	return structure_at(c) == null


func set_structure(s: Dictionary) -> void:
	structures[index(s["hex"])] = s


func remove_structure_at(c: Dictionary) -> void:
	structures[index(c)] = null


func penalty_at(c: Dictionary) -> float:
	if not in_bounds(c):
		return 0.0
	return penalty[index(c)]


func reset_penalties() -> void:
	penalty.fill(0.0)


func add_penalty(center: Dictionary, radius: int, amount: float) -> void:
	var row := int(center["row"])
	var col := int(center["col"])
	for r in range(row - radius, row + radius + 1):
		for cc in range(col - radius - 1, col + radius + 2):
			var c := {"col": cc, "row": r}
			if not in_bounds(c):
				continue
			if HexLib.hex_distance(center, c) <= radius:
				penalty[index(c)] += amount


func neighbors_in_bounds(c: Dictionary) -> Array:
	var out: Array = []
	for n in HexLib.neighbors(c):
		if in_bounds(n):
			out.append(n)
	return out
