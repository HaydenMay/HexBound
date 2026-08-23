extends Node3D

const HEX_SPACING := 1.732
const PATH_LEN := 8

var waypoints: Array[Vector3] = []
var ritual_pos := Vector3.ZERO
var enemy: MeshInstance3D
var seg := 0.0
var seg_idx := 0
var tower_hexes: Dictionary = {}
var cam: Camera3D

func _ready() -> void:
	cam = Camera3D.new()
	cam.position = Vector3(PATH_LEN * HEX_SPACING * 0.5, 10, 6)
	cam.rotation_degrees = Vector3(-58, 0, 0)
	add_child(cam)

	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-55, 30, 0)
	sun.light_energy = 1.3
	add_child(sun)

	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color(0.05, 0.04, 0.09)
	env.environment = e
	add_child(env)

	var hex_mesh := CylinderMesh.new()
	hex_mesh.top_radius = 0.92
	hex_mesh.bottom_radius = 0.92
	hex_mesh.height = 0.24
	for i in PATH_LEN + 2:
		var x := i * HEX_SPACING
		var tile := MeshInstance3D.new()
		tile.mesh = hex_mesh
		var mat := StandardMaterial3D.new()
		mat.albedo_color = Color(0.17, 0.14, 0.26)
		if i == PATH_LEN + 1:
			mat.albedo_color = Color(0.29, 0.16, 0.35)
			ritual_pos = Vector3(x, 0, 0)
		tile.material_override = mat
		tile.position = Vector3(x, -0.12, 0)
		add_child(tile)
		if i <= PATH_LEN:
			waypoints.append(Vector3(x, 0, 0))

	var tower := build_tower()
	tower.position = Vector3(4 * HEX_SPACING, 0.12, -1.6)
	tower_hexes[Vector2i(4, -1)] = tower
	add_child(tower)

	enemy = MeshInstance3D.new()
	var cap := CapsuleMesh.new()
	cap.radius = 0.3
	cap.height = 1.0
	enemy.mesh = cap
	var emat := StandardMaterial3D.new()
	emat.albedo_color = Color(0.9, 0.25, 0.25)
	enemy.material_override = emat
	enemy.position = waypoints[0]
	add_child(enemy)

func build_tower() -> Node3D:
	var g := Node3D.new()
	var base := MeshInstance3D.new()
	var cyl := CylinderMesh.new()
	cyl.top_radius = 0.34
	cyl.bottom_radius = 0.45
	cyl.height = 0.5
	base.mesh = cyl
	base.position.y = 0.25
	var bm := StandardMaterial3D.new()
	bm.albedo_color = Color(0.23, 0.18, 0.32)
	base.material_override = bm
	var top := MeshInstance3D.new()
	var cone := CylinderMesh.new()
	cone.top_radius = 0.0
	cone.bottom_radius = 0.3
	cone.height = 0.8
	top.mesh = cone
	top.position.y = 0.9
	var tm := StandardMaterial3D.new()
	tm.albedo_color = Color(0.18, 0.42, 0.27)
	top.material_override = tm
	g.add_child(base)
	g.add_child(top)
	return g

func _process(dt: float) -> void:
	if seg_idx >= waypoints.size() - 1:
		flash_ritual()
		seg_idx = 0
		seg = 0.0
	seg += dt * 0.55
	while seg >= 1.0 and seg_idx < waypoints.size() - 1:
		seg -= 1.0
		seg_idx += 1
	var a := waypoints[seg_idx]
	var b := waypoints[mini(seg_idx + 1, waypoints.size() - 1)]
	enemy.position = a.lerp(b, seg)

func flash_ritual() -> void:
	var flash := MeshInstance3D.new()
	var ring := TorusMesh.new()
	ring.inner_radius = 0.7
	ring.outer_radius = 0.85
	flash.mesh = ring
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(1.0, 0.35, 0.3)
	m.emission_enabled = true
	m.emission = Color(1.0, 0.35, 0.3)
	m.emission_energy_multiplier = 3.0
	flash.material_override = m
	flash.position = ritual_pos + Vector3(0, 0.15, 0)
	add_child(flash)
	var tw := create_tween()
	tw.tween_property(flash, "scale", Vector3(2.4, 2.4, 2.4), 0.5)
	tw.parallel().tween_property(flash, "transparency", 1.0, 0.5)
	tw.tween_callback(flash.queue_free)

func _unhandled_input(event: InputEvent) -> void:
	var pressed := false
	var pos := Vector2.ZERO
	if event is InputEventScreenTouch and event.pressed:
		pressed = true
		pos = event.position
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		pressed = true
		pos = event.position
	if not pressed:
		return
	var from := cam.project_ray_origin(pos)
	var dir := cam.project_ray_normal(pos)
	var plane := Plane(Vector3.UP, Vector3(0, 0.12, 0))
	var hit = plane.intersects_ray(from, dir)
	if hit == null:
		return
	var col := int(round(hit.x / HEX_SPACING))
	var row := int(round(hit.z / (HEX_SPACING * 0.75)))
	var key := Vector2i(col, row)
	if row == 0 or tower_hexes.has(key):
		return
	var tower := build_tower()
	tower.position = Vector3(col * HEX_SPACING, 0.12, row * HEX_SPACING * 0.75)
	tower_hexes[key] = tower
	add_child(tower)
