extends Node3D

signal warned(reason: String)

var game: SimGame
var view: BattleView
var input_ctrl: InputController
var hud: Hud
var paused := false
var speed := 1.0

var _selected_structure = null
var _selected_enemy = null
var _seen_intros := {}


func _ready() -> void:
	var config: Dictionary = LevelsData.LEVELS[0]["config"]
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


func _process(dt: float) -> void:
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
