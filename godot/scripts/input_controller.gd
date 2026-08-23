class_name InputController
extends Node

signal tapped(hex: Dictionary, is_touch: bool, enemy)
signal cancel_requested
signal action(name: String)

const STRUCTURE_ORDER := [
	"bonepalisade",
	"hexcauldron",
	"stormtotem",
	"thorngrove",
	"mushroomring",
	"whisperingidol",
	"moonwell",
	"spellmirror",
	"watchingeye"
]

const DIGIT_KEYS := [KEY_1, KEY_2, KEY_3, KEY_4, KEY_5, KEY_6, KEY_7, KEY_8, KEY_9]

var view: BattleView
var keys := {}

var _touches := {}
var _touch_panning := false
var _pinch_dist := 0.0
var _last_touch_pos := Vector2.ZERO

var _mouse_down := false
var _mouse_panning := false
var _last_mouse := Vector2.ZERO


func _process(dt: float) -> void:
	if view == null:
		return
	var mx := 0.0
	var mz := 0.0
	if keys.has(KEY_W):
		mz -= 1.0
	if keys.has(KEY_S):
		mz += 1.0
	if keys.has(KEY_A):
		mx -= 1.0
	if keys.has(KEY_D):
		mx += 1.0
	if mx != 0.0 or mz != 0.0:
		var speed := 15.0 * (view.dist / 22.0) * dt
		view.target.x += mx * speed
		view.target.z += mz * speed
		view._clamp_target()


func _unhandled_input(event: InputEvent) -> void:
	if view == null:
		return
	if event is InputEventScreenTouch:
		_handle_screen_touch(event)
	elif event is InputEventScreenDrag:
		_handle_screen_drag(event)
	elif event is InputEventMagnifyGesture:
		view.dist = clampf(view.dist / event.factor, 9.0, 36.0)
	elif event is InputEventMouseMotion:
		if not _touches.is_empty():
			return
		if _mouse_down:
			var delta: Vector2 = event.position - _last_mouse
			if not _mouse_panning and absf(delta.x) + absf(delta.y) > 7.0:
				_mouse_panning = true
			if _mouse_panning:
				var wpp := view.world_per_pixel()
				view.target.x -= (event.position.x - _last_mouse.x) * wpp
				view.target.z -= (event.position.y - _last_mouse.y) * wpp
				view._clamp_target()
			_last_mouse = event.position
		else:
			view.hover_hex = view.pick_hex(event.position)
			view.has_hover = true
	elif event is InputEventMouseButton:
		if not _touches.is_empty():
			return
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				_mouse_down = true
				_mouse_panning = false
				_last_mouse = event.position
			else:
				if _mouse_down and not _mouse_panning:
					_emit_tap(event.position, false)
				_mouse_down = false
				_mouse_panning = false
		elif event.button_index == MOUSE_BUTTON_RIGHT and event.pressed:
			cancel_requested.emit()
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			view.dist = clampf(view.dist * 1.09, 9.0, 36.0)
		elif event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
			view.dist = clampf(view.dist / 1.09, 9.0, 36.0)
	elif event is InputEventKey:
		match event.keycode:
			KEY_W, KEY_A, KEY_S, KEY_D:
				if not event.echo:
					if event.pressed:
						keys[event.keycode] = true
					else:
						keys.erase(event.keycode)
			_:
				if event.pressed and not event.echo:
					var idx := DIGIT_KEYS.find(event.keycode)
					if idx >= 0 and idx < STRUCTURE_ORDER.size():
						action.emit("def:%s" % STRUCTURE_ORDER[idx])
					else:
						match event.keycode:
							KEY_ESCAPE:
								cancel_requested.emit()
							KEY_P:
								action.emit("pause")
							KEY_SPACE:
								action.emit("space")


func _handle_screen_touch(t: InputEventScreenTouch) -> void:
	if t.pressed:
		_touches[t.index] = t.position
		if _touches.size() == 1:
			_touch_panning = false
			_last_touch_pos = t.position
		else:
			_touch_panning = true
			if _touches.size() == 2:
				_pinch_dist = _two_finger_dist()
	else:
		_touches.erase(t.index)
		if _touches.size() < 2:
			_pinch_dist = 0.0
		if not t.canceled and not _touch_panning and _touches.is_empty():
			_emit_tap(t.position, true)
		if _touches.is_empty():
			_touch_panning = false


func _handle_screen_drag(d: InputEventScreenDrag) -> void:
	_touches[d.index] = d.position
	if _touches.size() >= 2:
		var nd := _two_finger_dist()
		if nd > 10.0 and _pinch_dist > 0.0:
			view.dist = clampf(view.dist * (_pinch_dist / nd), 9.0, 36.0)
			_pinch_dist = nd
		return
	var dx := d.position.x - _last_touch_pos.x
	var dy := d.position.y - _last_touch_pos.y
	if not _touch_panning and absf(dx) + absf(dy) > 7.0:
		_touch_panning = true
	if _touch_panning:
		var wpp := view.world_per_pixel()
		view.target.x -= dx * wpp
		view.target.z -= dy * wpp
		view._clamp_target()
	_last_touch_pos = d.position


func _emit_tap(screen: Vector2, is_touch: bool) -> void:
	var at := view.pick_world(screen)
	if at.is_empty():
		return
	tapped.emit(HexLib.world_to_hex(at["x"], at["z"]), is_touch, view.pick_enemy(at))


func _two_finger_dist() -> float:
	var pts := _touches.values()
	if pts.size() < 2:
		return 0.0
	return (Vector2(pts[0]) - Vector2(pts[1])).length()
