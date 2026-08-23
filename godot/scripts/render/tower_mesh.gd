class_name TowerMesh


static func _mat(albedo: Color, emissive := Color.BLACK, energy := 0.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = albedo
	if energy > 0.0:
		m.emission_enabled = true
		m.emission = emissive
		m.emission_energy_multiplier = energy
	m.roughness = 0.75
	return m


static func _mesh_node(mesh: Mesh, mat: StandardMaterial3D, pos: Vector3) -> MeshInstance3D:
	var n := MeshInstance3D.new()
	n.mesh = mesh
	n.material_override = mat
	n.position = pos
	return n


static func build(def: Dictionary, kind: String) -> Node3D:
	var root := Node3D.new()
	var accent := Color(float(def["color"]) / 16777216.0,
		fmod(floor(float(def["color"]) / 65536.0), 256.0) / 255.0,
		fmod(floor(float(def["color"]) / 256.0), 256.0) / 255.0)
	var stone := _mat(Color(0.32, 0.29, 0.38))
	var wood := _mat(Color(0.36, 0.27, 0.2))
	var cloth := _mat(Color(0.13, 0.1, 0.19))
	match kind:
		"wall":
			for i in 3:
				var post := CapsuleMesh.new()
				post.radius = 0.07
				post.height = 0.7
				root.add_child(_mesh_node(post, _mat(Color(0.85, 0.82, 0.72)), Vector3(-0.28 + 0.28 * i, 0.35, 0)))
			var bar := BoxMesh.new()
			bar.size = Vector3(0.75, 0.09, 0.09)
			root.add_child(_mesh_node(bar, _mat(Color(0.78, 0.74, 0.62)), Vector3(0, 0.55, 0)))
		"cauldron":
			var pot := CylinderMesh.new()
			pot.top_radius = 0.42
			pot.bottom_radius = 0.3
			pot.height = 0.5
			root.add_child(_mesh_node(pot, stone, Vector3(0, 0.25, 0)))
			var brew := CylinderMesh.new()
			brew.top_radius = 0.36
			brew.bottom_radius = 0.36
			brew.height = 0.05
			root.add_child(_mesh_node(brew, _mat(accent.darkened(0.2), accent, 1.6), Vector3(0, 0.52, 0)))
			root.add_child(_make_resident(cloth, accent, Vector3(-0.45, 0, 0.15)))
		"totem":
			for i in 3:
				var slab := BoxMesh.new()
				slab.size = Vector3(0.44 - i * 0.06, 0.24, 0.3)
				root.add_child(_mesh_node(slab, stone, Vector3(0, 0.12 + i * 0.25, 0)))
			var crystal := CylinderMesh.new()
			crystal.top_radius = 0.0
			crystal.bottom_radius = 0.14
			crystal.height = 0.4
			root.add_child(_mesh_node(crystal, _mat(accent.lightened(0.2), accent, 1.4), Vector3(0, 1.0, 0)))
		"grove":
			for i in 4:
				var briar := SphereMesh.new()
				briar.radius = 0.16
				briar.height = 0.32
				var a := TAU * float(i) / 4.0
				root.add_child(_mesh_node(briar, _mat(Color(0.16, 0.29, 0.22), Color(0.62, 1.0, 0.81), 1.5), Vector3(cos(a) * 0.26, 0.26, sin(a) * 0.26)))
		"ring":
			for i in 5:
				var a := TAU * float(i) / 5.0
				var stem := CylinderMesh.new()
				stem.top_radius = 0.04
				stem.bottom_radius = 0.05
				stem.height = 0.22
				root.add_child(_mesh_node(stem, _mat(Color(0.9, 0.87, 0.8)), Vector3(cos(a) * 0.34, 0.11, sin(a) * 0.34)))
				var cap := SphereMesh.new()
				cap.radius = 0.12
				cap.height = 0.16
				root.add_child(_mesh_node(cap, _mat(accent.darkened(0.25)), Vector3(cos(a) * 0.34, 0.26, sin(a) * 0.34)))
		"idol":
			var body := BoxMesh.new()
			body.size = Vector3(0.3, 0.8, 0.22)
			root.add_child(_mesh_node(body, stone, Vector3(0, 0.4, 0)))
			var head := SphereMesh.new()
			head.radius = 0.14
			head.height = 0.28
			root.add_child(_mesh_node(head, _mat(accent.darkened(0.1), accent, 0.5), Vector3(0, 0.92, 0)))
		"well":
			var pool := CylinderMesh.new()
			pool.top_radius = 0.48
			pool.bottom_radius = 0.52
			pool.height = 0.16
			root.add_child(_mesh_node(pool, stone, Vector3(0, 0.08, 0)))
			var water := CylinderMesh.new()
			water.top_radius = 0.4
			water.bottom_radius = 0.4
			water.height = 0.04
			root.add_child(_mesh_node(water, _mat(accent.darkened(0.15), accent, 0.9), Vector3(0, 0.17, 0)))
			root.add_child(_make_resident(cloth, accent, Vector3(0.4, 0, 0.2)))
		"mirror":
			var glass := BoxMesh.new()
			glass.size = Vector3(0.62, 0.9, 0.06)
			root.add_child(_mesh_node(glass, _mat(accent, accent, 0.25), Vector3(0, 0.45, 0)))
			var frame := BoxMesh.new()
			frame.size = Vector3(0.7, 0.08, 0.1)
			root.add_child(_mesh_node(frame, stone, Vector3(0, 0.92, 0)))
		"eye":
			for i in 7:
				var ang := TAU * float(i) / 7.0
				var st := MeshInstance3D.new()
				var dode := SphereMesh.new()
				dode.radius = 0.11
				dode.height = 0.22
				st.mesh = dode
				st.material_override = _mat(Color(0.35, 0.32, 0.42))
				st.position = Vector3(cos(ang) * 0.55, 0.1, sin(ang) * 0.55)
				root.add_child(st)
			var iris := MeshInstance3D.new()
			var octa := CylinderMesh.new()
			octa.top_radius = 0.0
			octa.bottom_radius = 0.2
			octa.height = 0.4
			iris.mesh = octa
			iris.material_override = _mat(Color(0.29, 0.23, 0.13), accent, 2.2)
			iris.position.y = 0.95
			iris.name = "Iris"
			root.add_child(iris)
		_:
			var fallback := BoxMesh.new()
			fallback.size = Vector3(0.5, 0.5, 0.5)
			root.add_child(_mesh_node(fallback, stone, Vector3(0, 0.25, 0)))
	return root


static func _make_resident(cloth: StandardMaterial3D, accent: Color, pos: Vector3) -> Node3D:
	var r := Node3D.new()
	r.position = pos
	var body := CapsuleMesh.new()
	body.radius = 0.11
	body.height = 0.42
	r.add_child(_mesh_node(body, cloth, Vector3(0, 0.21, 0)))
	var head := SphereMesh.new()
	head.radius = 0.09
	head.height = 0.18
	var hat := _mat(Color(0.16, 0.13, 0.24))
	r.add_child(_mesh_node(head, hat, Vector3(0, 0.48, 0)))
	var tip := CylinderMesh.new()
	tip.top_radius = 0.0
	tip.bottom_radius = 0.09
	tip.height = 0.26
	r.add_child(_mesh_node(tip, _mat(accent.darkened(0.3)), Vector3(0, 0.66, 0)))
	r.set_meta("resident", true)
	return r
