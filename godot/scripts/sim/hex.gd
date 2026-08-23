class_name HexLib

const HEX_SIZE := 1.0
const SQRT3 := 1.7320508075688772


static func neighbors(c: Dictionary) -> Array:
	var deltas: Array
	if int(c["row"]) % 2 == 0:
		deltas = [[1, 0], [-1, 0], [0, -1], [-1, -1], [0, 1], [-1, 1]]
	else:
		deltas = [[1, 0], [-1, 0], [1, -1], [0, -1], [1, 1], [0, 1]]
	var out: Array = []
	for d in deltas:
		out.append({"col": int(c["col"]) + d[0], "row": int(c["row"]) + d[1]})
	return out


static func _offset_to_cube(c: Dictionary) -> Vector3i:
	var row := int(c["row"])
	var x := int(c["col"]) - (row - (row & 1)) / 2
	var z := row
	return Vector3i(x, -x - z, z)


static func hex_distance(a: Dictionary, b: Dictionary) -> int:
	var ca := _offset_to_cube(a)
	var cb := _offset_to_cube(b)
	return (absi(ca.x - cb.x) + absi(ca.y - cb.y) + absi(ca.z - cb.z)) / 2


static func same_hex(a: Dictionary, b: Dictionary) -> bool:
	return int(a["col"]) == int(b["col"]) and int(a["row"]) == int(b["row"])


static func hex_to_world(c: Dictionary) -> Dictionary:
	var row := int(c["row"])
	return {
		"x": SQRT3 * (float(int(c["col"])) + 0.5 * float(row & 1)) * HEX_SIZE,
		"z": 1.5 * float(row) * HEX_SIZE
	}


static func lerp_hex_to_world(a: Dictionary, b, t: float) -> Dictionary:
	var pa := hex_to_world(a)
	if b == null:
		return pa
	var pb := hex_to_world(b)
	return {
		"x": pa["x"] + (pb["x"] - pa["x"]) * t,
		"z": pa["z"] + (pb["z"] - pa["z"]) * t
	}


static func world_to_hex(x: float, z: float) -> Dictionary:
	var q := ((SQRT3 / 3.0) * x - (1.0 / 3.0) * z) / HEX_SIZE
	var r := ((2.0 / 3.0) * z) / HEX_SIZE
	var cube := _cube_round(q, r)
	return {"col": cube.x + (cube.z - (cube.z & 1)) / 2, "row": cube.z}


static func _cube_round(q: float, r: float) -> Vector3i:
	var s := -q - r
	var rq := roundi(q)
	var rr := roundi(r)
	var rs := roundi(s)
	var dq := absf(float(rq) - q)
	var dr := absf(float(rr) - r)
	var ds := absf(float(rs) - s)
	if dq > dr and dq > ds:
		rq = -rr - rs
	elif dr > ds:
		rr = -rq - rs
	return Vector3i(rq, -rq - rr, rr)
