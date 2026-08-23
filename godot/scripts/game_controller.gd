extends Node3D

var game: SimGame
var view: BattleView
var paused := false
var speed := 1.0


func _ready() -> void:
	var config: Dictionary = LevelsData.LEVELS[0]["config"]
	game = SimGame.new(config, {"enemies": EnemiesData.DEFS, "structures": StructuresData.DEFS})
	view = BattleView.new()
	view.bind(game)
	add_child(view)
	view.setup(config)
	game.events.on("enemyBreached", func(_p): view.flash_breach(game.grid.ritual))


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


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and event.keycode == KEY_P:
		paused = not paused
	elif event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		pass
