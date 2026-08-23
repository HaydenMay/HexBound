extends GutTest

var ctrl


func before_each():
	ctrl = load("res://scripts/game_controller.gd").new()
	get_tree().root.add_child(ctrl)
	await get_tree().process_frame
	if not ctrl.started:
		ctrl._start_level(0)
	await get_tree().process_frame
	await get_tree().process_frame


func after_each():
	if is_instance_valid(ctrl):
		ctrl.queue_free()
	await get_tree().process_frame
	await get_tree().process_frame


func _first_placeable_hex() -> Dictionary:
	var g: BattlefieldGrid = ctrl.game.grid
	for row in g.rows:
		for col in g.cols:
			var c := {"col": col, "row": row}
			if ctrl.game.can_place("bonepalisade", c)["ok"]:
				return c
	return {}


func _screen_of(hex: Dictionary) -> Vector2:
	var w: Dictionary = HexLib.hex_to_world(hex)
	return ctrl.view.cam.unproject_position(Vector3(w["x"], 0.0, w["z"]))


func _mouse_click(screen: Vector2) -> void:
	var down := InputEventMouseButton.new()
	down.button_index = MOUSE_BUTTON_LEFT
	down.pressed = true
	down.position = screen
	ctrl.input_ctrl._unhandled_input(down)
	var up := InputEventMouseButton.new()
	up.button_index = MOUSE_BUTTON_LEFT
	up.pressed = false
	up.position = screen
	ctrl.input_ctrl._unhandled_input(up)


func _touch_tap(index: int, screen: Vector2) -> void:
	var down := InputEventScreenTouch.new()
	down.index = index
	down.pressed = true
	down.position = screen
	ctrl.input_ctrl._unhandled_input(down)
	var up := InputEventScreenTouch.new()
	up.index = index
	up.pressed = false
	up.position = screen
	ctrl.input_ctrl._unhandled_input(up)


func test_pick_hex_roundtrip_at_screen_center():
	var vp: Rect2 = ctrl.view.cam.get_viewport().get_visible_rect()
	var hex = ctrl.view.pick_hex(vp.size * 0.5)
	assert_not_null(hex)
	assert_true(ctrl.game.grid.in_bounds(hex), "center ray should land inside grid")


func test_mouse_tap_places_selected_structure_directly():
	var target := _first_placeable_hex()
	assert_ne(target, {}, "expected at least one placeable hex")
	var essence_before: float = ctrl.game.essence
	ctrl.view.selected_def_id = "bonepalisade"
	_mouse_click(_screen_of(target))
	assert_true(ctrl.game.structure_at(target) != null, "wall should be placed by single click")
	assert_lt(ctrl.game.essence, essence_before)


func test_touch_requires_two_tap_confirm():
	var target := _first_placeable_hex()
	ctrl.view.selected_def_id = "bonepalisade"
	var screen := _screen_of(target)
	_touch_tap(0, screen)
	assert_null(ctrl.game.structure_at(target), "first touch tap should only arm pending")
	assert_eq(ctrl.view.pending_hex, target)
	_touch_tap(0, screen)
	assert_true(ctrl.game.structure_at(target) != null, "second identical tap places")


func test_right_click_clears_selection():
	ctrl.view.selected_def_id = "hexcauldron"
	var right := InputEventMouseButton.new()
	right.button_index = MOUSE_BUTTON_RIGHT
	right.pressed = true
	right.position = Vector2(10, 10)
	ctrl.input_ctrl._unhandled_input(right)
	assert_eq(ctrl.view.selected_def_id, "", "right click should cancel selection")


func test_digit_action_selects_palette_def():
	ctrl.input_ctrl.action.emit("def:mushroomring")
	assert_eq(ctrl.view.selected_def_id, "mushroomring")
