class_name Menu
extends CanvasLayer

signal pick_level(index: int)
signal size_changed(size: String)
signal reset_requested

const ACCENT := Color(0.698, 0.42, 1.0)
const PANEL_BG := Color(0.07, 0.055, 0.11, 0.97)

var _size_buttons := {}
var field_size := "medium"
var unlocked_levels := 1


func setup(p_unlocked: int, p_size: String) -> void:
	unlocked_levels = p_unlocked
	field_size = p_size
	layer = 20
	_build()


func refresh(p_unlocked: int, p_size: String) -> void:
	for c in get_children():
		c.queue_free()
	setup(p_unlocked, p_size)


func _build() -> void:
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(root)
	var dim := ColorRect.new()
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	dim.color = Color(0.04, 0.03, 0.07)
	root.add_child(dim)

	var center := VBoxContainer.new()
	center.set_anchors_preset(Control.PRESET_CENTER)
	center.grow_horizontal = Control.GROW_DIRECTION_BOTH
	center.grow_vertical = Control.GROW_DIRECTION_BOTH
	center.alignment = BoxContainer.ALIGNMENT_CENTER
	center.add_theme_constant_override("separation", 14)
	root.add_child(center)

	var title := Label.new()
	title.text = "HexBound"
	title.add_theme_font_size_override("font_size", 42)
	title.add_theme_color_override("font_color", ACCENT)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	center.add_child(title)

	var sub := Label.new()
	sub.text = "Choose the ground for your ritual"
	sub.add_theme_font_size_override("font_size", 15)
	sub.modulate = Color(1, 1, 1, 0.6)
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	center.add_child(sub)

	var list := VBoxContainer.new()
	list.add_theme_constant_override("separation", 8)
	center.add_child(list)
	for i in LevelsData.LEVELS.size():
		var lvl: Dictionary = LevelsData.LEVELS[i]
		var locked: bool = i + 1 > unlocked_levels
		var btn := Button.new()
		btn.custom_minimum_size = Vector2(420, 58)
		if locked:
			btn.text = "%d  ·  %s\nSealed by the hunters" % [i + 1, lvl["name"]]
			btn.disabled = true
		else:
			btn.text = "%d  ·  %s\n%s" % [i + 1, lvl["name"], lvl["blurb"]]
			btn.pressed.connect(func(): pick_level.emit(i))
		list.add_child(btn)

	var size_row := HBoxContainer.new()
	size_row.alignment = BoxContainer.ALIGNMENT_CENTER
	size_row.add_theme_constant_override("separation", 8)
	center.add_child(size_row)
	for size in LevelsData.FIELD_SIZES:
		var sb := Button.new()
		sb.toggle_mode = true
		sb.text = size.capitalize()
		sb.custom_minimum_size = Vector2(96, 34)
		sb.button_pressed = size == field_size
		sb.pressed.connect(_on_size.bind(size))
		size_row.add_child(sb)
		_size_buttons[size] = sb

	var reset := Button.new()
	reset.text = "Forget progress"
	reset.flat = true
	reset.pressed.connect(func(): reset_requested.emit())
	center.add_child(reset)


func _on_size(size: String) -> void:
	field_size = size
	SaveStore.store_field_size(size)
	for key in _size_buttons:
		_size_buttons[key].button_pressed = key == size
	size_changed.emit(size)
