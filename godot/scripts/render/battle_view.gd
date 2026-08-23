class_name BattleView
extends Node3D

const TILE_H := 0.18
const ENEMY_RED := Color(0.9, 0.25, 0.25)
const POISON_GREEN := Color(0.45, 0.85, 0.4)

var sim: SimGame
var cam: Camera3D
var target := Vector3.ZERO
var dist := 22.0
var cam_blend := 0.0
var ritual_node: MeshInstance3D
var ritual_flash := 0.0
var time := 0.0

var _tiles_root: Node3D
var _towers := {}
var _enemies := {}
var _residents: Array = []
var _arrows_mm: MultiMeshInstance3D


func bind(game: SimGame) -> void:
	sim = game
	game.events.on("fieldChanged", _on_field_changed)


func _on_field_changed(_p = null) -> void:
	_rebuild_arrows()


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


func _build_field(config: Dictionary) -> void:
	var cols := int(config["cols"])
	var rows := int(config["rows"])
	var entrance: Dictionary = config["entrance"]
	var ritual: Dictionary = config["ritual"]
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
			var base := Color(0.17, 0.14, 0.26)
			if HexLib.same_hex(c, ritual):
				base = Color(0.29, 0.16, 0.35)
				m.emission_enabled = true
				m.emission = base
				m.emission_energy_multiplier = 0.7
			elif HexLib.same_hex(c, entrance):
				base = Color(0.22, 0.13, 0.2)
			m.albedo_color = base
			t.material_override = m
			t.position = Vector3(w["x"], -TILE_H / 2, w["z"])
			_tiles_root.add_child(t)
	var rw := HexLib.hex_to_world(ritual)
	ritual_node = MeshInstance3D.new()
	var ring := TorusMesh.new()
	ring.inner_radius = 0.62
	ring.outer_radius = 0.8
	ritual_node.mesh = ring
	var rm := StandardMaterial3D.new()
	rm.albedo_color = Color(0.75, 0.5, 0.85)
	rm.emission_enabled = true
	rm.emission = Color(0.75, 0.5, 0.85)
	rm.emission_energy_multiplier = 1.2
	ritual_node.material_override = rm
	ritual_node.position = Vector3(rw["x"], 0.12, rw["z"])
	_tiles_root.add_child(ritual_node)


func _build_ridge(config: Dictionary) -> void:
	var cols := int(config["cols"])
	var rows := int(config["rows"])
	var width := float(cols) * HexLib.SQRT3 + 3.0
	var back_z := float(rows) * 1.5 + 2.2
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
	(ritual_node.material_override as StandardMaterial3D).emission_energy_multiplier = pulse
	ritual_flash = maxf(ritual_flash - dt * 1.6, 0.0)


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
