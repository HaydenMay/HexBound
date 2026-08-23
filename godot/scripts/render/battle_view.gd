class_name BattleView
extends Node3D

const TILE_H := 0.18
const ENEMY_RED := Color(0.9, 0.25, 0.25)
const POISON_GREEN := Color(0.45, 0.85, 0.4)
const VALID_COLOR := Color(0x7fe3a0)
const INVALID_COLOR := Color(0xff5a5a)

var sim: SimGame
var cam: Camera3D
var target := Vector3.ZERO
var dist := 22.0
var cam_blend := 0.0
var selected_def_id := ""
var pending_hex = null
var hover_hex = null
var has_hover := false
var ritual_node: Node3D
var ritual_orb: MeshInstance3D
var _ritual_ring_mat: StandardMaterial3D
var ritual_flash := 0.0
var time := 0.0

var _tiles := {}
var _tiles_root: Node3D
var _towers := {}
var _enemies := {}
var _residents: Array = []
var _arrows_mm: MultiMeshInstance3D
var _select_ring: MeshInstance3D
var _ghost: Node3D = null
var _ghost_def_id := ""
var _ghost_valid := false
var _ghost_ring_mat: StandardMaterial3D
var _ghost_disc_mat: StandardMaterial3D


func bind(game: SimGame) -> void:
	sim = game
	game.events.on("fieldChanged", _on_field_changed)


func _on_field_changed(_p = null) -> void:
	_rebuild_arrows()
	_rebuild_tile_colors()


func setup(config: Dictionary) -> void:
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-52, 35, 0)
	sun.light_color = Color(1.0, 0.86, 0.68)
	sun.light_energy = 1.15
	add_child(sun)

	var moon := DirectionalLight3D.new()
	moon.rotation_degrees = Vector3(-38, -145, 0)
	moon.light_color = Color(0.55, 0.65, 1.0)
	moon.light_energy = 0.5
	add_child(moon)

	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color(0.055, 0.04, 0.09)
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(0.604, 0.541, 0.784)
	e.ambient_light_energy = 0.55
	e.fog_enabled = true
	e.fog_light_color = Color(0.094, 0.07, 0.157)
	e.fog_density = 0.012
	env.environment = e
	add_child(env)

	_tiles_root = Node3D.new()
	add_child(_tiles_root)
	_build_field(config)

	var ground := MeshInstance3D.new()
	var disc := PlaneMesh.new()
	disc.size = Vector2(160.0, 160.0)
	ground.mesh = disc
	var gm := StandardMaterial3D.new()
	gm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	gm.albedo_color = Color(0.071, 0.055, 0.11)
	ground.material_override = gm
	ground.position.y = -0.35
	add_child(ground)

	_build_ridge(config)

	cam = Camera3D.new()
	cam.fov = 50.0
	cam.near = 0.1
	cam.far = 200.0
	_init_camera(config)
	add_child(cam)
	cam.make_current()

	_arrows_mm = MultiMeshInstance3D.new()
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = _arrow_mesh()
	mm.instance_count = int(config["cols"]) * int(config["rows"])
	_arrows_mm.multimesh = mm
	_arrows_mm.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(_arrows_mm)
	if sim != null:
		_rebuild_arrows()

	_select_ring = MeshInstance3D.new()
	var ring_mesh := TorusMesh.new()
	ring_mesh.inner_radius = 0.82
	ring_mesh.outer_radius = 0.95
	_select_ring.mesh = ring_mesh
	var sm := StandardMaterial3D.new()
	sm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	sm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	sm.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	sm.albedo_color = Color(0.698, 0.42, 1.0, 0.9)
	_select_ring.material_override = sm
	_select_ring.position.y = 0.16
	_select_ring.visible = false
	add_child(_select_ring)


func _build_field(config: Dictionary) -> void:
	var cols := int(config["cols"])
	var rows := int(config["rows"])
	var tile := CylinderMesh.new()
	tile.top_radius = 0.92
	tile.bottom_radius = 0.92
	tile.height = TILE_H
	tile.radial_segments = 6
	for row in rows:
		for col in cols:
			var c := {"col": col, "row": row}
			var w := HexLib.hex_to_world(c)
			var t := MeshInstance3D.new()
			t.mesh = tile
			var m := StandardMaterial3D.new()
			m.albedo_color = Color(0.169, 0.137, 0.259)
			t.material_override = m
			t.position = Vector3(w["x"], -TILE_H / 2, w["z"])
			_tiles_root.add_child(t)
			_tiles[SimGame._hex_key(c)] = t
	_rebuild_tile_colors()
	_build_ritual(config)


func _rebuild_tile_colors() -> void:
	if sim == null:
		return
	var g := sim.grid
	for row in g.rows:
		for col in g.cols:
			var c := {"col": col, "row": row}
			var t: MeshInstance3D = _tiles.get(SimGame._hex_key(c))
			if t == null:
				continue
			var col_hex := Color(0.169, 0.137, 0.259)
			if g.structure_at(c) != null:
				col_hex = Color(0.122, 0.098, 0.188)
			elif g.penalty_at(c) > 0.0:
				col_hex = Color(0.153, 0.251, 0.184)
			elif HexLib.same_hex(c, g.entrance):
				col_hex = Color(0.353, 0.227, 0.478)
			elif HexLib.same_hex(c, g.ritual):
				col_hex = Color(0.29, 0.165, 0.353)
			(t.material_override as StandardMaterial3D).albedo_color = col_hex


func _build_ritual(config: Dictionary) -> void:
	var ritual: Dictionary = config["ritual"]
	var rw := HexLib.hex_to_world(ritual)
	ritual_node = Node3D.new()
	ritual_node.position = Vector3(rw["x"], 0.0, rw["z"])
	add_child(ritual_node)
	var pedestal := MeshInstance3D.new()
	var ped := CylinderMesh.new()
	ped.top_radius = 1.1
	ped.bottom_radius = 1.3
	ped.height = 0.5
	ped.radial_segments = 8
	pedestal.mesh = ped
	var pm := StandardMaterial3D.new()
	pm.albedo_color = Color(0.227, 0.184, 0.322)
	pedestal.material_override = pm
	pedestal.position.y = 0.25
	ritual_node.add_child(pedestal)
	var ring := MeshInstance3D.new()
	var torus := TorusMesh.new()
	torus.inner_radius = 0.88
	torus.outer_radius = 1.02
	ring.mesh = torus
	_ritual_ring_mat = StandardMaterial3D.new()
	_ritual_ring_mat.albedo_color = Color(0.165, 0.102, 0.243)
	_ritual_ring_mat.emission_enabled = true
	_ritual_ring_mat.emission = Color(0.698, 0.42, 1.0)
	_ritual_ring_mat.emission_energy_multiplier = 1.0
	ring.material_override = _ritual_ring_mat
	ring.position.y = 0.62
	ritual_node.add_child(ring)
	ritual_orb = MeshInstance3D.new()
	var orb := SphereMesh.new()
	orb.radius = 0.28
	orb.height = 0.56
	orb.radial_segments = 14
	orb.rings = 7
	ritual_orb.mesh = orb
	var om := StandardMaterial3D.new()
	om.albedo_color = Color(0.227, 0.165, 0.333)
	om.emission_enabled = true
	om.emission = Color(0.847, 0.667, 1.0)
	om.emission_energy_multiplier = 2.0
	ritual_orb.material_override = om
	ritual_orb.position.y = 1.2
	ritual_node.add_child(ritual_orb)


func _build_ridge(config: Dictionary) -> void:
	var cols := int(config["cols"])
	var width := float(cols) * HexLib.SQRT3 + 3.0
	var back_z := -2.2
	var rng := RandomNumberGenerator.new()
	rng.seed = 7
	for i in int(width / 0.9):
		var spire := MeshInstance3D.new()
		var cone := CylinderMesh.new()
		cone.top_radius = 0.0
		cone.bottom_radius = rng.randf_range(0.35, 0.8)
		var h := rng.randf_range(1.6, 4.2)
		cone.height = h
		spire.mesh = cone
		var m := StandardMaterial3D.new()
		var shade := rng.randf_range(0.06, 0.11)
		m.albedo_color = Color(shade * 0.9, shade * 0.75, shade * 1.5)
		spire.material_override = m
		spire.position = Vector3(-width / 2 + float(i) * 0.9 + rng.randf_range(-0.2, 0.2), h / 2 - 0.6, back_z + rng.randf_range(-0.8, 0.8))
		_tiles_root.add_child(spire)


func _init_camera(config: Dictionary) -> void:
	var rows := int(config["rows"])
	var ritual: Dictionary = config["ritual"]
	var rw := HexLib.hex_to_world(ritual)
	target = Vector3(rw["x"], 0.0, rw["z"] - float(rows) * 0.18)
	var aspect := 1.777
	if cam.get_viewport() != null:
		aspect = float(cam.get_viewport().get_visible_rect().size.x) / maxf(float(cam.get_viewport().get_visible_rect().size.y), 1.0)
	var factor := clampf(1.55 / aspect, 1.0, 2.5)
	dist = clampf(float(rows) * 1.45 * factor, 12.0, 34.0)


func _clamp_target() -> void:
	var g := sim.grid
	var min_x: float = HexLib.hex_to_world({"col": 0, "row": 0})["x"] - 3.0
	var max_x: float = HexLib.hex_to_world({"col": g.cols - 1, "row": g.rows - 1})["x"] + 3.0
	target.x = clampf(target.x, min_x, max_x)
	target.z = clampf(target.z, -3.0, 1.5 * float(g.rows - 1) + 3.0)


func _arrow_mesh() -> Mesh:
	var cone := CylinderMesh.new()
	cone.top_radius = 0.0
	cone.bottom_radius = 0.11
	cone.height = 0.3
	cone.radial_segments = 4
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	m.albedo_color = Color(0.435, 0.847, 0.784, 0.22)
	cone.material = m
	return cone


func _rebuild_arrows() -> void:
	var mm := _arrows_mm.multimesh
	var n := 0
	for row in sim.grid.rows:
		for col in sim.grid.cols:
			var c := {"col": col, "row": row}
			if not sim.field.reachable(c):
				continue
			var next = sim.field.next_step(c)
			if next == null:
				continue
			var from := HexLib.hex_to_world(c)
			var to := HexLib.hex_to_world(next)
			var yaw := atan2(to["x"] - from["x"], to["z"] - from["z"])
			var basis := Basis(Vector3.UP, yaw) * Basis(Vector3.RIGHT, PI / 2.0)
			mm.set_instance_transform(n, Transform3D(basis, Vector3(from["x"], 0.14, from["z"])))
			n += 1
	mm.visible_instance_count = n


func sync(game: SimGame, dt: float) -> void:
	time += dt
	sim = game

	var want_battle: bool = game.phase != "building"
	cam_blend += clampf((1.0 if want_battle else 0.0) - cam_blend, -1.1 * dt, 1.1 * dt)
	var cam_e := cam_blend * cam_blend * (3.0 - 2.0 * cam_blend)
	var h_factor := lerpf(0.92, 0.58, cam_e)
	var z_factor := lerpf(0.72, 0.94, cam_e)
	cam.position = Vector3(target.x, dist * h_factor, target.z + dist * z_factor)
	cam.look_at(Vector3(target.x, 0.0, target.z + float(game.grid.rows) * 0.26 * cam_e), Vector3.UP)

	for key in _towers.keys():
		if not game.by_hex.has(key):
			var gone: Node3D = _towers[key]
			gone.queue_free()
			_towers.erase(key)
	for inst in game.structures:
		var key := SimGame._hex_key(inst["hex"])
		if not _towers.has(key):
			var node := TowerMesh.build(inst["def"], StructureOps.kind_stats(inst)["kind"])
			var w := HexLib.hex_to_world(inst["hex"])
			node.position = Vector3(w["x"], 0.09, w["z"])
			add_child(node)
			_towers[key] = node
			for child in node.get_children():
				if child is Node3D and child.has_meta("resident"):
					_residents.append({"node": child, "phase": randf() * TAU})

	var live_ids := {}
	var cauldron = game.first_cauldron_stats()
	var max_stacks := 5
	if cauldron != null:
		max_stacks = int(cauldron["maxStacks"])
	for e in game.enemies:
		live_ids[e.id] = true
		var node: MeshInstance3D
		if not _enemies.has(e.id):
			node = MeshInstance3D.new()
			var cap := CapsuleMesh.new()
			cap.radius = 0.28 * float(e.def.get("scale", 1.0))
			cap.height = 0.9 * float(e.def.get("scale", 1.0))
			node.mesh = cap
			var m := StandardMaterial3D.new()
			m.albedo_color = ENEMY_RED
			node.material_override = m
			add_child(node)
			_enemies[e.id] = node
		else:
			node = _enemies[e.id]
		var p := HexLib.lerp_hex_to_world(e.cur, e.next, e.t)
		node.position = Vector3(p["x"], 0.42 * float(e.def.get("scale", 1.0)), p["z"])
		var tint := ENEMY_RED.lerp(POISON_GREEN, clampf(float(e.poison_stacks) / float(max_stacks), 0.0, 1.0))
		(node.material_override as StandardMaterial3D).albedo_color = tint
	for id in _enemies.keys():
		if not live_ids.has(id):
			(_enemies[id] as MeshInstance3D).queue_free()
			_enemies.erase(id)

	for r in _residents:
		var n: Node3D = r["node"]
		if not is_instance_valid(n):
			continue
		n.position.y = sin(time * 2.0 + r["phase"]) * 0.03
		n.rotation.z = sin(time * 1.4 + r["phase"]) * 0.05

	var pulse := 0.7 + (game.progress / 100.0) * 1.6 + ritual_flash * 3.0
	_ritual_ring_mat.emission_energy_multiplier = pulse
	ritual_orb.position.y = 1.2 + sin(time * 2.2) * 0.12
	ritual_orb.rotation.y += dt * 1.5
	ritual_orb.scale = Vector3.ONE * (1.0 + (game.progress / 100.0) * 0.6 + ritual_flash * 0.35)
	ritual_flash = maxf(ritual_flash - dt * 1.6, 0.0)

	_select_ring.rotation.y += dt * 0.8
	_update_ghost()


func set_selected(inst) -> void:
	if inst == null:
		_select_ring.visible = false
		return
	var w: Dictionary = HexLib.hex_to_world(inst["hex"])
	_select_ring.position = Vector3(w["x"], 0.16, w["z"])
	_select_ring.visible = true


func pick_world(screen: Vector2) -> Dictionary:
	var origin := cam.project_ray_origin(screen)
	var normal := cam.project_ray_normal(screen)
	if absf(normal.y) < 0.00001:
		return {}
	var tt := -origin.y / normal.y
	if tt <= 0.0:
		return {}
	var p := origin + normal * tt
	return {"x": p.x, "z": p.z}


func pick_hex(screen: Vector2):
	var at := pick_world(screen)
	if at.is_empty():
		return null
	return HexLib.world_to_hex(at["x"], at["z"])


func pick_enemy(at: Dictionary):
	var best = null
	var best_d := INF
	for en in sim.enemies:
		var p: Dictionary = HexLib.lerp_hex_to_world(en.cur, en.next, en.t)
		var d := Vector2(p["x"] - float(at["x"]), p["z"] - float(at["z"])).length()
		if d <= 0.9 + 0.15 * float(en.def.get("scale", 1.0)) and d < best_d:
			best = en
			best_d = d
	return best


func world_per_pixel() -> float:
	var h := maxf(float(cam.get_viewport().get_visible_rect().size.y), 1.0)
	return 2.0 * dist * tan(deg_to_rad(cam.fov) / 2.0) / h


func _update_ghost() -> void:
	var hex = pending_hex if pending_hex != null else hover_hex
	if selected_def_id == "" or hex == null or not sim.grid.in_bounds(hex) or (pending_hex == null and not has_hover):
		if _ghost != null:
			_ghost.visible = false
		return
	if _ghost_def_id != selected_def_id or _ghost == null:
		_build_ghost(selected_def_id)
	var valid: bool = sim.can_place(selected_def_id, hex)["ok"]
	var w: Dictionary = HexLib.hex_to_world(hex)
	_ghost.visible = true
	_ghost.position = Vector3(w["x"], 0.0, w["z"])
	if valid != _ghost_valid:
		var col := VALID_COLOR if valid else INVALID_COLOR
		_ghost_ring_mat.albedo_color = Color(col.r, col.g, col.b, 0.4)
		_ghost_disc_mat.albedo_color = Color(col.r, col.g, col.b, 0.35)
		_ghost_valid = valid


func _build_ghost(def_id: String) -> void:
	if _ghost != null:
		_ghost.queue_free()
	var def: Dictionary = StructuresData.DEFS[def_id]
	var tier: Dictionary = def["tiers"][0]
	var g := Node3D.new()
	var mesh := TowerMesh.build(def, tier["kind"])
	_make_translucent(mesh)
	g.add_child(mesh)

	var r := maxf(float(tier["radius"]) - 0.08, 0.1)
	_ghost_ring_mat = _flat_mat(Color(VALID_COLOR.r, VALID_COLOR.g, VALID_COLOR.b, 0.4))
	var ring := MeshInstance3D.new()
	var rmesh := TorusMesh.new()
	rmesh.inner_radius = r
	rmesh.outer_radius = float(tier["radius"])
	ring.mesh = rmesh
	ring.material_override = _ghost_ring_mat
	ring.position.y = 0.07
	g.add_child(ring)

	_ghost_disc_mat = _flat_mat(Color(VALID_COLOR.r, VALID_COLOR.g, VALID_COLOR.b, 0.35))
	var disc := MeshInstance3D.new()
	var dmesh := CylinderMesh.new()
	dmesh.top_radius = 0.9
	dmesh.bottom_radius = 0.9
	dmesh.height = 0.02
	disc.mesh = dmesh
	disc.material_override = _ghost_disc_mat
	disc.position.y = 0.05
	g.add_child(disc)

	_ghost = g
	_ghost_def_id = def_id
	add_child(g)


func _make_translucent(node: Node) -> void:
	for child in node.get_children():
		if child is MeshInstance3D and child.material_override is StandardMaterial3D:
			var m := (child.material_override as StandardMaterial3D).duplicate() as StandardMaterial3D
			m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
			m.albedo_color.a *= 0.5
			child.material_override = m


func _flat_mat(col: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	m.albedo_color = col
	return m


func flash_breach(at: Dictionary) -> void:
	ritual_flash = 1.0
	var ring := MeshInstance3D.new()
	var torus := TorusMesh.new()
	torus.inner_radius = 0.7
	torus.outer_radius = 0.85
	ring.mesh = torus
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(1.0, 0.35, 0.3)
	m.emission_enabled = true
	m.emission = Color(1.0, 0.35, 0.3)
	m.emission_energy_multiplier = 3.0
	ring.material_override = m
	var w := HexLib.hex_to_world(at)
	ring.position = Vector3(w["x"], 0.15, w["z"])
	add_child(ring)
	var tw := create_tween()
	tw.tween_property(ring, "scale", Vector3(2.4, 2.4, 2.4), 0.5)
	tw.parallel().tween_property(ring, "transparency", 1.0, 0.5)
	tw.tween_callback(ring.queue_free)
