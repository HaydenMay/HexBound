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
	var g = ctrl.game.grid
	for row in g.rows:
		for col in g.cols:
			if ctrl.game.can_place("bonepalisade", {"col": col, "row": row})["ok"]:
				return {"col": col, "row": row}
	return {}


func test_palette_builds_nine_cards_and_selection_syncs():
	assert_eq(ctrl.hud.palette_cards.size(), 9)
	ctrl.hud.select_def("hexcauldron")
	assert_eq(ctrl.view.selected_def_id, "hexcauldron")
	assert_true(ctrl.hud.palette_cards["hexcauldron"].button_pressed)
	ctrl.input_ctrl.action.emit("def:stormtotem")
	assert_eq(ctrl.view.selected_def_id, "stormtotem")


func test_warn_banner_shows_mapped_text():
	ctrl.hud.warn("sealed")
	assert_true(ctrl.hud.banner.visible)
	assert_eq(ctrl.hud.banner.text, "THE CIRCLE MUST REMAIN REACHABLE")
	ctrl.hud.warn("unaffordable")
	assert_eq(ctrl.hud.banner.text, "NOT ENOUGH ESSENCE")


func test_tap_on_structure_opens_inspect_with_dismantle():
	var target := _first_placeable_hex()
	assert_ne(target, {})
	assert_true(ctrl.game.place("bonepalisade", target))
	ctrl._on_tap(target, false, null)
	assert_true(ctrl.hud.inspect_panel.visible)
	assert_true(ctrl.hud.inspect_title.text.begins_with("Bone Palisade"))
	var found_sell := false
	for btn in ctrl.hud.inspect_body.get_children():
		if btn is Button and btn.has_meta("special") and str(btn.get_meta("special")) == "__sell":
			found_sell = true
			assert_false(btn.disabled, "sell unlocked while building phase")
			btn.emit_signal("pressed")
	assert_true(found_sell)


func test_clear_selection_hides_panels():
	var target := _first_placeable_hex()
	assert_ne(target, {})
	assert_true(ctrl.game.place("bonepalisade", target))
	ctrl._on_tap(target, false, null)
	assert_true(ctrl.hud.inspect_panel.visible)
	ctrl._clear_selection()
	assert_false(ctrl.hud.inspect_panel.visible)


func test_end_overlay_on_won():
	ctrl.game.events.emit("won", null)
	assert_true(ctrl.hud.overlay.visible)
	assert_eq(ctrl.hud.overlay_title.text, "The Ritual Is Complete")
	ctrl.game.events.emit("lost", null)
	assert_eq(ctrl.hud.overlay_title.text, "The Circle Is Broken")


func test_boss_intro_shown_once_for_non_boss():
	var def_id := ""
	for id in EnemiesData.DEFS:
		if EnemiesData.DEFS[id].has("intro"):
			def_id = id
			break
	assert_ne(def_id, "")
	var fake = {"def": EnemiesData.DEFS[def_id]}
	ctrl._on_enemy_spawned(fake)
	assert_true(ctrl.hud.boss_intro.visible)
	assert_true(ctrl._seen_intros.has(def_id))
	var child_count: int = ctrl.hud.boss_intro.get_child_count()
	ctrl.hud.show_banner("x", false)
	ctrl._on_enemy_spawned(fake)
	assert_eq(ctrl.hud.boss_intro.get_child_count(), child_count, "second sighting must not rebuild intro")
