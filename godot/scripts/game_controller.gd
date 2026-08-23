extends Node3D

signal warned(reason: String)

var game: SimGame
var view: BattleView
var input_ctrl: InputController
var hud: Hud
var menu: Menu
var paused := false
var speed := 1.0
var started := false
var level_index := -1
var field_size := "medium"
var unlocked_levels := 1

var _selected_structure = null
var _selected_enemy = null
var _seen_intros := {}


func _ready() -> void:
	unlocked_levels = SaveStore.load_save()["unlockedLevels"]
	field_size = SaveStore.load_field_size()
	_show_menu()
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--shot="):
			_run_shot(a.get_slice("=", 1))
			return


func _run_shot(mode: String) -> void:
	await get_tree().process_frame
	_start_level(0)
	game.essence = 999
	var showcase := [
		["spellmirror", 1, 2],
		["hexcauldron", 3, 2],
		["bonepalisade", 2, 4],
		["thorngrove", 2, 1],
		["stormtotem", 4, 4],
		["mushroomring", 7, 2],
		["whisperingidol", 7, 4],
		["moonwell", 8, 2],
		["watchingeye", 5, 3]
	]
	for s in showcase:
		var hex := {"col": int(s[1]), "row": int(s[2])}
		if game.can_place(s[0], hex)["ok"]:
			game.place(s[0], hex)
	game.start_wave()
	await get_tree().create_timer(5.0).timeout
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	var dir := ProjectSettings.globalize_path("res://").path_join("../screenshots")
	DirAccess.make_dir_recursive_absolute(dir)
	img.save_png(dir.path_join("godot-battle-%s.png" % mode))
	print("SHOT_SAVED %s" % dir.path_join("godot-battle-%s.png" % mode))
	get_tree().quit()


func _show_menu() -> void:
	menu = Menu.new()
	add_child(menu)
	menu.setup(unlocked_levels, field_size)
	menu.pick_level.connect(_start_level)
	menu.size_changed.connect(_on_size_changed)
	menu.reset_requested.connect(_reset_save)


func _on_size_changed(size: String) -> void:
	field_size = size


func _reset_save() -> void:
	unlocked_levels = 1
	SaveStore.reset_save()
	if is_instance_valid(menu):
		menu.refresh(unlocked_levels, field_size)


func _start_level(i: int) -> void:
	if started:
		return
	started = true
	level_index = i
	if is_instance_valid(menu):
		menu.queue_free()
	var config: Dictionary = FieldSize.apply(LevelsData.LEVELS[i]["config"], field_size)

	game = SimGame.new(config, {"enemies": EnemiesData.DEFS, "structures": StructuresData.DEFS})
	view = BattleView.new()
	view.bind(game)
	add_child(view)
	view.setup(config)

	input_ctrl = InputController.new()
	input_ctrl.view = view
	add_child(input_ctrl)
	input_ctrl.tapped.connect(_on_tap)
	input_ctrl.cancel_requested.connect(_clear_selection)
	input_ctrl.action.connect(_on_action)

	hud = Hud.new()
	add_child(hud)
	hud.setup(game, self, view)
	warned.connect(hud.warn)

	game.events.on("enemyBreached", func(_p): view.flash_breach(game.grid.ritual))
	game.events.on("enemySpawned", _on_enemy_spawned)
	game.events.on("won", func(_p):
		unlocked_levels = maxi(unlocked_levels, i + 2)
		SaveStore.save_progress(unlocked_levels))


func _process(dt: float) -> void:
	if not started:
		return
	if not paused:
		var step := dt * speed
		while step > 0.0:
			var slice := minf(step, 1.0 / 60.0)
			game.update(slice)
			view.sync(game, slice)
			step -= slice
	else:
		view.sync(game, dt)
	hud.update_hud()


func _on_enemy_spawned(e) -> void:
	var intro = e.def.get("intro")
	if intro == null:
		return
	if e.def.get("boss", false) or not _seen_intros.has(e.def["id"]):
		hud.show_intro(intro["title"], intro["lines"])
	_seen_intros[e.def["id"]] = true


func _on_tap(hex: Dictionary, is_touch: bool, enemy) -> void:
	if enemy != null:
		view.pending_hex = null
		_selected_structure = null
		_selected_enemy = enemy
		view.set_selected(null)
		hud.set_pending(null)
		hud.show_structure(null)
		hud.show_enemy(enemy)
		return
	var inst = game.structure_at(hex)
	if inst != null:
		view.pending_hex = null
		_selected_enemy = null
		_selected_structure = inst
		view.set_selected(inst)
		hud.set_pending(null)
		hud.show_enemy(null)
		hud.show_structure(inst)
		return
	var def_id: String = view.selected_def_id
	if def_id != "":
		var res := game.can_place(def_id, hex)
		if not res["ok"]:
			warned.emit(res["reason"])
			return
		if is_touch:
			var p = view.pending_hex
			if p == null or not HexLib.same_hex(p, hex):
				view.pending_hex = hex.duplicate()
				hud.set_pending(view.pending_hex)
				return
		view.pending_hex = null
		hud.set_pending(null)
		game.place(def_id, hex)
		return
	_clear_selection()


func _clear_selection() -> void:
	view.pending_hex = null
	view.selected_def_id = ""
	_selected_structure = null
	_selected_enemy = null
	view.set_selected(null)
	hud.set_pending(null)
	hud.show_structure(null)
	hud.show_enemy(null)
	hud.sync_palette()


func _on_action(name: String) -> void:
	if name.begins_with("def:"):
		hud.select_def(name.substr(4))
	elif name == "pause":
		paused = not paused
	elif name == "space":
		if game.phase == "building":
			game.start_wave()
		else:
			paused = not paused
