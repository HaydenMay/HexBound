class_name FlowField
extends RefCounted

var dist := PackedFloat32Array()
var grid: BattlefieldGrid


func _init(p_grid: BattlefieldGrid) -> void:
	grid = p_grid
	var n := grid.cols * grid.rows
	dist.resize(n)
	dist.fill(INF)
	var visited := PackedByteArray()
	visited.resize(n)
	visited.fill(0)
	var start := grid.index(grid.ritual)
	dist[start] = 0.0

	while true:
		var u := -1
		var best := INF
		for i in n:
			if visited[i] == 0 and dist[i] < best:
				best = dist[i]
				u = i
		if u < 0:
			break
		visited[u] = 1
		var cur := grid.from_index(u)
		for nb in HexLib.neighbors(cur):
			if not grid.is_walkable(nb):
				continue
			var ni := grid.index(nb)
			if visited[ni] == 1:
				continue
			var nd := best + 1.0 + grid.penalty_at(nb)
			if nd < dist[ni]:
				dist[ni] = nd


func distance_at(c: Dictionary) -> float:
	if not grid.in_bounds(c):
		return INF
	return dist[grid.index(c)]


func reachable(c: Dictionary) -> bool:
	return is_finite(distance_at(c))


func next_step(c: Dictionary):
	if HexLib.same_hex(c, grid.ritual):
		return null
	if not reachable(c):
		return null
	var best = null
	var best_dist := distance_at(c)
	for nb in grid.neighbors_in_bounds(c):
		if not grid.is_walkable(nb):
			continue
		var d := distance_at(nb)
		if d < best_dist:
			best_dist = d
			best = nb
	return best
