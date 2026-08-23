class_name Hud
extends CanvasLayer

const WARN_TEXT := {
	"sealed": "THE CIRCLE MUST REMAIN REACHABLE",
	"unaffordable": "NOT ENOUGH ESSENCE",
	"blocked": "CANNOT BUILD THERE"
}
const PANEL_BG := Color(0.07, 0.055, 0.11, 0.92)
const ACCENT := Color(0.698, 0.42, 1.0)
const DANGER := Color(1.0, 0.42, 0.38)

var game: SimGame
var ctrl: Node
var view: BattleView

var essence_label: Label
var wave_label: Label
var ritual_fill: ProgressBar
var ritual_label: Label
var pips: Array = []
var start_btn: Button
var pause_btn: Button
var speed_btn: Button
var banner: Label
var place_hint: Label
var preview_box: RichTextLabel
var boss_intro: VBoxContainer
var vignette: ColorRect
var overlay: Control
var overlay_title: Label
var overlay_sub: Label
var inspect_panel: PanelContainer
var inspect_title: Label
var inspect_body: VBoxContainer
var enemy_panel: PanelContainer
var enemy_title: Label
var enemy_body: VBoxContainer
var palette_cards := {}

var _selected_structure = null
var _selected_enemy_id := -1
var _inspect_key := ""
var _enemy_key := ""
var _preview_key := ""
var _banner_t := 0.0
var _intro_t := 0.0
var _vignette_a := 0.0


func setup(p_game: SimGame, p_ctrl: Node, p_view: BattleView) -> void:
	game = p_game
	ctrl = p_ctrl
	view = p_view
	layer = 10
	_build_ui()
	sync_palette()

	game.events.on("waveStarted", func(n): announce("Wave %d" % int(n)))
	game.events.on("waveCleared", func(n): announce("Wave %d cleared" % int(n)))
	game.events.on("enemyBreached", func(_p):
		flash_vignette()
		BreachAudio.play(self))
	game.events.on("structureDestroyed", func(s):
		if _selected_structure == s:
			show_structure(null)
		show_banner("Your %s was shattered!" % s["def"]["name"], true))
	game.events.on("won", func(_p): show_end(true))
	game.events.on("lost", func(_p): show_end(false))


func _build_ui() -> void:
	var root := Control.new()
	root.name = "HudRoot"
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)

	var topbar := PanelContainer.new()
	topbar.set_anchors_preset(Control.PRESET_TOP_LEFT)
	topbar.position = Vector2(12, 12)
	topbar.add_theme_stylebox_override("panel", _panel_style())
	root.add_child(topbar)
	var tb := HBoxContainer.new()
	tb.add_theme_constant_override("separation", 18)
	topbar.add_child(tb)
	essence_label = _label("Essence 0", 17)
	tb.add_child(essence_label)
	wave_label = _label("Next: Wave 1 / 1", 17)
	tb.add_child(wave_label)
	var ritual_box := VBoxContainer.new()
	tb.add_child(ritual_box)
	ritual_label = _label("Ritual 0%", 13)
	ritual_box.add_child(ritual_label)
	ritual_fill = ProgressBar.new()
	ritual_fill.min_value = 0.0
	ritual_fill.max_value = 100.0
	ritual_fill.show_percentage = false
	ritual_fill.custom_minimum_size = Vector2(170, 10)
	ritual_fill.modulate = ACCENT
	ritual_box.add_child(ritual_fill)
	var stab := HBoxContainer.new()
	stab.name = "Stability"
	stab.add_theme_constant_override("separation", 4)
	tb.add_child(stab)
	for i in game.max_stability:
		var pip := ColorRect.new()
		pip.custom_minimum_size = Vector2(12, 12)
		stab.add_child(pip)
		pips.append(pip)

	preview_box = RichTextLabel.new()
	preview_box.bbcode_enabled = true
	preview_box.fit_content = true
	preview_box.scroll_active = false
	preview_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	preview_box.position = Vector2(14, 78)
	preview_box.custom_minimum_size = Vector2(500, 24)
	root.add_child(preview_box)

	var controls := VBoxContainer.new()
	controls.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	controls.position = Vector2(-150, 12)
	controls.custom_minimum_size = Vector2(138, 0)
	controls.add_theme_constant_override("separation", 6)
	root.add_child(controls)
	start_btn = _button("Begin Wave 1")
	start_btn.pressed.connect(func(): game.start_wave())
	controls.add_child(start_btn)
	pause_btn = _button("Pause")
	pause_btn.pressed.connect(func(): ctrl.paused = not ctrl.paused)
	controls.add_child(pause_btn)
	speed_btn = _button("1x")
	speed_btn.pressed.connect(func(): ctrl.speed = 1 if ctrl.speed >= 3 else ctrl.speed + 1)
	controls.add_child(speed_btn)
	var abandon_btn := _button("Abandon")
	abandon_btn.pressed.connect(func(): get_tree().reload_current_scene())
	controls.add_child(abandon_btn)

	var palette_wrap := VBoxContainer.new()
	palette_wrap.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	palette_wrap.offset_left = 8
	palette_wrap.offset_right = -8
	palette_wrap.offset_top = -132
	palette_wrap.offset_bottom = -8
	palette_wrap.alignment = BoxContainer.ALIGNMENT_END
	palette_wrap.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(palette_wrap)
	place_hint = _label("", 14)
	place_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	place_hint.visible = false
	palette_wrap.add_child(place_hint)
	var palette := HBoxContainer.new()
	palette.add_theme_constant_override("separation", 6)
	palette.alignment = BoxContainer.ALIGNMENT_CENTER
	palette_wrap.add_child(palette)
	for i in InputController.STRUCTURE_ORDER.size():
		var id: String = InputController.STRUCTURE_ORDER[i]
		var def: Dictionary = StructuresData.DEFS[id]
		var card := Button.new()
		card.toggle_mode = true
		card.custom_minimum_size = Vector2(128, 84)
		card.add_theme_stylebox_override("normal", _card_style(false))
		card.add_theme_stylebox_override("hover", _card_style(false))
		card.add_theme_stylebox_override("pressed", _card_style(true))
		card.pressed.connect(select_def.bind(id))
		var cv := VBoxContainer.new()
		cv.set_anchors_preset(Control.PRESET_FULL_RECT)
		cv.offset_left = 6
		cv.offset_right = -6
		cv.offset_top = 4
		cv.offset_bottom = -4
		cv.mouse_filter = Control.MOUSE_FILTER_IGNORE
		card.add_child(cv)
		var key_row := HBoxContainer.new()
		key_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
		cv.add_child(key_row)
		var key_lab := _label(str(i + 1), 11)
		key_lab.modulate = Color(1, 1, 1, 0.45)
		key_row.add_child(key_lab)
		var gem := ColorRect.new()
		gem.color = Color(int(def["color"]))
		gem.custom_minimum_size = Vector2(10, 10)
		key_row.add_child(gem)
		var name_lab := _label(def["name"], 13)
		name_lab.clip_text = true
		cv.add_child(name_lab)
		var cost_lab := _label("%d essence" % int(def["cost"]), 11)
		cost_lab.modulate = ACCENT
		cv.add_child(cost_lab)
		var blurb := _label(def["blurb"], 9)
		blurb.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		blurb.modulate = Color(1, 1, 1, 0.55)
		blurb.size_flags_vertical = Control.SIZE_EXPAND_FILL
		cv.add_child(blurb)
		palette.add_child(card)
		palette_cards[id] = card

	banner = _label("", 20)
	banner.set_anchors_preset(Control.PRESET_CENTER_TOP)
	banner.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	banner.grow_horizontal = Control.GROW_DIRECTION_BOTH
	banner.position.y = 110
	banner.visible = false
	root.add_child(banner)

	boss_intro = VBoxContainer.new()
	boss_intro.set_anchors_preset(Control.PRESET_CENTER)
	boss_intro.grow_horizontal = Control.GROW_DIRECTION_BOTH
	boss_intro.grow_vertical = Control.GROW_DIRECTION_BOTH
	boss_intro.alignment = BoxContainer.ALIGNMENT_CENTER
	boss_intro.visible = false
	boss_intro.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(boss_intro)

	vignette = ColorRect.new()
	vignette.set_anchors_preset(Control.PRESET_FULL_RECT)
	vignette.color = Color(DANGER.r, DANGER.g, DANGER.b, 0.0)
	vignette.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(vignette)

	_build_inspect(root)
	_build_enemy_inspect(root)

	overlay = Control.new()
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	overlay.visible = false
	root.add_child(overlay)
	var dim := ColorRect.new()
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	dim.color = Color(0, 0, 0, 0.72)
	overlay.add_child(dim)
	var ov := VBoxContainer.new()
	ov.set_anchors_preset(Control.PRESET_CENTER)
	ov.grow_horizontal = Control.GROW_DIRECTION_BOTH
	ov.grow_vertical = Control.GROW_DIRECTION_BOTH
	ov.alignment = BoxContainer.ALIGNMENT_CENTER
	overlay.add_child(ov)
	overlay_title = _label("", 34)
	overlay_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	ov.add_child(overlay_title)
	overlay_sub = _label("", 16)
	overlay_sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	overlay_sub.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	overlay_sub.custom_minimum_size = Vector2(420, 0)
	ov.add_child(overlay_sub)


func _build_inspect(root: Control) -> void:
	inspect_panel = PanelContainer.new()
	inspect_panel.set_anchors_preset(Control.PRESET_RIGHT_WIDE)
	inspect_panel.offset_left = -280
	inspect_panel.offset_right = -12
	inspect_panel.offset_top = 120
	inspect_panel.offset_bottom = -150
	inspect_panel.add_theme_stylebox_override("panel", _panel_style())
	inspect_panel.visible = false
	root.add_child(inspect_panel)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 8)
	inspect_panel.add_child(v)
	var head := HBoxContainer.new()
	v.add_child(head)
	inspect_title = _label("", 15)
	inspect_title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	inspect_title.clip_text = true
	head.add_child(inspect_title)
	var close := _button("X")
	close.custom_minimum_size = Vector2(30, 26)
	close.pressed.connect(show_structure.bind(null))
	head.add_child(close)
	inspect_body = VBoxContainer.new()
	inspect_body.add_theme_constant_override("separation", 6)
	v.add_child(inspect_body)


func _build_enemy_inspect(root: Control) -> void:
	enemy_panel = PanelContainer.new()
	enemy_panel.set_anchors_preset(Control.PRESET_LEFT_WIDE)
	enemy_panel.offset_left = 12
	enemy_panel.offset_right = 272
	enemy_panel.offset_top = 120
	enemy_panel.offset_bottom = -150
	enemy_panel.add_theme_stylebox_override("panel", _panel_style())
	enemy_panel.visible = false
	root.add_child(enemy_panel)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 8)
	enemy_panel.add_child(v)
	var head := HBoxContainer.new()
	v.add_child(head)
	enemy_title = _label("", 15)
	enemy_title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	enemy_title.clip_text = true
	head.add_child(enemy_title)
	var close := _button("X")
	close.custom_minimum_size = Vector2(30, 26)
	close.pressed.connect(show_enemy.bind(null))
	head.add_child(close)
	enemy_body = VBoxContainer.new()
	enemy_body.add_theme_constant_override("separation", 6)
	v.add_child(enemy_body)


func _panel_style() -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = PANEL_BG
	s.set_corner_radius_all(6)
	s.border_color = Color(ACCENT.r, ACCENT.g, ACCENT.b, 0.35)
	s.set_border_width_all(1)
	s.content_margin_left = 10
	s.content_margin_right = 10
	s.content_margin_top = 8
	s.content_margin_bottom = 8
	return s


func _card_style(selected: bool) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = Color(PANEL_BG.r, PANEL_BG.g, PANEL_BG.b, 1.0) if selected else PANEL_BG
	s.set_corner_radius_all(5)
	s.border_color = ACCENT if selected else Color(1, 1, 1, 0.14)
	s.set_border_width_all(2 if selected else 1)
	s.content_margin_left = 6
	s.content_margin_right = 6
	s.content_margin_top = 4
	s.content_margin_bottom = 4
	return s


func _label(text: String, size: int) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l


func _button(text: String) -> Button:
	var b := Button.new()
	b.text = text
	return b


func select_def(id: String) -> void:
	view.selected_def_id = id
	view.pending_hex = null
	set_pending(null)
	sync_palette()


func set_pending(hex) -> void:
	place_hint.visible = hex != null
	if hex != null:
		place_hint.text = "Tap the glowing hex again to conjure"


func sync_palette() -> void:
	for id in palette_cards:
		var card: Button = palette_cards[id]
		var selected: bool = view.selected_def_id == id
		card.button_pressed = selected
		card.add_theme_stylebox_override("normal", _card_style(selected))
		card.add_theme_stylebox_override("hover", _card_style(selected))


func show_structure(inst) -> void:
	_selected_structure = inst
	_inspect_key = ""
	inspect_panel.visible = inst != null
	if inst != null:
		render_inspect()


func show_enemy(enemy) -> void:
	_selected_enemy_id = int(enemy.id) if enemy != null else -1
	_enemy_key = ""
	enemy_panel.visible = enemy != null
	if enemy != null:
		render_enemy_inspect()


func warn(reason: String) -> void:
	show_banner(WARN_TEXT[reason], true)


func show_intro(title: String, lines: Array) -> void:
	for c in boss_intro.get_children():
		c.queue_free()
	var t := _label(title, 30)
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	t.add_theme_color_override("font_color", ACCENT)
	boss_intro.add_child(t)
	for line in lines:
		var l := _label(line, 15)
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		boss_intro.add_child(l)
	boss_intro.visible = true
	_intro_t = 5.0


func show_end(win: bool) -> void:
	overlay_title.text = "The Ritual Is Complete" if win else "The Circle Is Broken"
	overlay_sub.text = "Your forbidden working succeeds. The coven grows stronger." \
		if win else "The hunters have shattered your working. The night belongs to them."
	overlay.visible = true


func announce(text: String) -> void:
	show_banner(text, false)


func show_banner(text: String, danger: bool) -> void:
	banner.text = text
	banner.add_theme_color_override("font_color", DANGER if danger else Color(1, 1, 1))
	banner.visible = true
	_banner_t = 1.9


func flash_vignette() -> void:
	_vignette_a = 0.28


func update_hud() -> void:
	var essence := int(game.essence)
	essence_label.text = "Essence %d" % essence
	for id in palette_cards:
		palette_cards[id].disabled = essence < int(StructuresData.DEFS[id]["cost"])

	var ended: bool = game.phase == "won" or game.phase == "lost"
	wave_label.text = ("Wave %d / %d" if game.phase == "active" else "Next: Wave %d / %d") \
		% [game.get_current_wave(), game.get_total_waves()]
	start_btn.visible = game.phase == "building" and not ended
	if game.phase == "building":
		start_btn.text = "Begin Wave %d" % game.get_current_wave()

	ritual_fill.value = game.progress
	ritual_label.text = "Ritual %d%%" % int(floorf(game.progress))

	for i in pips.size():
		pips[i].color = ACCENT if i < game.stability else Color(1, 1, 1, 0.12)

	if game.phase == "building":
		render_preview()

	if _selected_structure != null:
		render_inspect()
	if _selected_enemy_id >= 0:
		render_enemy_inspect()

	speed_btn.text = "%dx" % int(ctrl.speed)
	pause_btn.text = "Resume" if ctrl.paused else "Pause"
	pause_btn.disabled = ended

	if _banner_t > 0.0:
		_banner_t -= get_process_delta_time()
		if _banner_t <= 0.0:
			banner.visible = false
	if _intro_t > 0.0:
		_intro_t -= get_process_delta_time()
		if _intro_t <= 0.0:
			boss_intro.visible = false
	if _vignette_a > 0.0:
		_vignette_a = maxf(_vignette_a - get_process_delta_time() * 0.9, 0.0)
		vignette.color.a = _vignette_a


func render_preview() -> void:
	var wave = game.next_wave_preview()
	if wave == null:
		_preview_key = ""
		preview_box.text = ""
		return
	var key := str(game.wave_index)
	if key == _preview_key:
		return
	_preview_key = key
	var parts: Array = []
	for gr in wave["groups"]:
		var def: Dictionary = EnemiesData.DEFS[gr["enemy"]]
		var hex: String = Color(int(def["color"])).to_html(false)
		parts.append("[color=#%s]%dx %s[/color]" % [hex, int(gr["count"]), def["name"]])
	preview_box.text = "  ".join(parts)


func render_inspect() -> void:
	var inst: Dictionary = _selected_structure
	if inst == null or not inst.has("def"):
		return
	var tier: Dictionary = inst["def"]["tiers"][int(inst["tier_index"])]
	var shown: Dictionary = tier
	if inst["fork_id"] != null and tier.has("forks"):
		for f in tier["forks"]:
			if f["id"] == inst["fork_id"]:
				shown = f
				break
	var key := "%s,%s:%d:%s:%d" % [inst["hex"]["col"], inst["hex"]["row"], int(inst["tier_index"]), str(inst["fork_id"]), 1 if inst["contributed"] else 0]
	if key != _inspect_key:
		_inspect_key = key
		inspect_title.text = "%s — %s" % [inst["def"]["name"], shown["label"]]
		for c in inspect_body.get_children():
			c.queue_free()
		var desc := _label(shown["desc"], 12)
		desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		desc.custom_minimum_size = Vector2(230, 0)
		inspect_body.add_child(desc)
		var hp := _label("", 13)
		hp.name = "HpLabel"
		inspect_body.add_child(hp)
		var opts: Dictionary = game.upgrade_options(inst)
		if opts.has("forks"):
			for f in opts["forks"]:
				inspect_body.add_child(_upgrade_btn(f["label"], f["desc"], f["cost"], f["id"]))
		elif opts.has("next"):
			inspect_body.add_child(_upgrade_btn(opts["next"]["label"], opts["next"]["desc"], opts["next"]["cost"], ""))
		else:
			inspect_body.add_child(_label("Fully empowered", 12))
		var stats: Dictionary = StructureOps.kind_stats(inst)
		if stats["kind"] == "well":
			var sac := _upgrade_btn("Sacrifice Sprite", "%d burst around the well" % int(stats["well"]["sacrificeDamage"]), 0, "__sacrifice")
			inspect_body.add_child(sac)
		inspect_body.add_child(_upgrade_btn("Dismantle", "", game.refund_for(inst), "__sell"))
	var hp_label: Label = inspect_body.get_node_or_null("HpLabel")
	if hp_label != null:
		hp_label.text = "Structure integrity: %d / %d" % [maxi(int(ceil(inst["hp"])), 0), int(inst["max_hp"])]
	for btn in inspect_body.get_children():
		if btn is Button and btn.has_meta("cost") and not btn.has_meta("special"):
			btn.disabled = game.essence < float(btn.get_meta("cost"))
		elif btn is Button and btn.has_meta("special"):
			var kind: String = btn.get_meta("special")
			if kind == "__sell":
				var locked: bool = game.phase != "building"
				btn.disabled = locked
				var refund: int = game.refund_for(inst)
				(btn.get_meta("desc_label") as Label).text = ("The circle is sealed while foes march"
					if locked else ("It has served — partial return" if inst["contributed"] else "Untouched — full return"))
				(btn.get_meta("cost_label") as Label).text = "+%d essence" % refund
			elif kind == "__sacrifice":
				var ready: bool = inst["cooldown"] <= 0.0 and game.allies.size() > 0
				btn.disabled = not ready
				(btn.get_meta("cost_label") as Label).text = ("no sprites bound" if game.allies.is_empty()
					else ("recharging %ds" % int(ceil(inst["cooldown"])) if inst["cooldown"] > 0.0
					else "%d sprite(s) ready" % game.allies.size()))


func _upgrade_btn(label: String, desc: String, cost, tag: String) -> Button:
	var b := Button.new()
	var v := VBoxContainer.new()
	v.set_anchors_preset(Control.PRESET_FULL_RECT)
	v.offset_left = 6
	v.offset_right = -6
	v.offset_top = 3
	v.offset_bottom = -3
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	b.add_child(v)
	var l1 := _label(label, 13)
	v.add_child(l1)
	var l2 := _label(desc, 10)
	l2.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l2.modulate = Color(1, 1, 1, 0.65)
	v.add_child(l2)
	var l3 := _label("" if tag.begins_with("__") else "%d essence" % int(cost), 11)
	l3.modulate = ACCENT
	v.add_child(l3)
	b.custom_minimum_size = Vector2(240, 52)
	b.disabled = false
	if tag == "__sell":
		b.set_meta("special", "__sell")
		b.set_meta("desc_label", l2)
		b.set_meta("cost_label", l3)
		b.pressed.connect(func():
			if _selected_structure != null:
				game.sell_structure(_selected_structure))
	elif tag == "__sacrifice":
		b.set_meta("special", "__sacrifice")
		b.set_meta("cost_label", l3)
		b.pressed.connect(func():
			if _selected_structure != null and not game.sacrifice(_selected_structure):
				show_banner("The well is not ready", true))
	else:
		b.set_meta("cost", cost)
		b.set_meta("fork", tag)
		b.pressed.connect(func():
			if _selected_structure == null:
				return
			var res: String = game.upgrade(_selected_structure, tag)
			if res == "unaffordable":
				warn("unaffordable")
			if res == "ok":
				render_inspect())
	return b


func render_enemy_inspect() -> void:
	var live = null
	for e in game.enemies:
		if e.id == _selected_enemy_id:
			live = e
			break
	if live == null:
		show_enemy(null)
		return
	var key := "%d:%d" % [_selected_enemy_id, int(ceil(live.hp))]
	if key == _enemy_key:
		return
	_enemy_key = key
	enemy_title.text = live.def["name"]
	for c in enemy_body.get_children():
		c.queue_free()
	var hp := _label("Vitality: %d / %d" % [maxi(int(ceil(live.hp)), 0), int(live.def["hp"])], 13)
	enemy_body.add_child(hp)
	var tags: Array = []
	if float(live.def.get("curseResist", 0.0)) >= 0.5:
		tags.append("curse-proof")
	if live.def.get("charmImmune", false):
		tags.append("uncharmable")
	if live.def.get("silence", null) != null:
		tags.append("silencer")
	if live.def.get("cleanse", null) != null:
		tags.append("cleanser")
	if live.def.get("summon", null) != null:
		tags.append("summoner")
	if live.def.get("structureDamage", null) != null:
		tags.append("wallbreaker")
	if tags.size() > 0:
		enemy_body.add_child(_label(", ".join(tags), 11))
	var weakness: String
	if game.scouted.has(live.def["id"]):
		var w: String = live.def.get("weakness", "poison")
		weakness = "Weak: %s" % w.capitalize()
	else:
		weakness = "Weakness: ??? — scout with the Watching Eye"
	var wl := _label(weakness, 12)
	wl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	wl.custom_minimum_size = Vector2(220, 0)
	enemy_body.add_child(wl)
