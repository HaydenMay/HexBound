extends GutTest

const TMP_SAVE := "user://test-hexbound-save.json"
const TMP_SIZE := "user://test-hexbound-size.txt"


func after_each():
	SaveStore.reset_save(TMP_SAVE)
	SaveStore.reset_save(TMP_SIZE)
	await get_tree().process_frame


func test_apply_size_medium_returns_config_unchanged():
	var cfg: Dictionary = LevelsData.LEVELS[0]["config"]
	var out: Dictionary = FieldSize.apply(cfg, "medium")
	assert_eq(out, cfg)


func test_apply_size_small_and_large_math():
	var cfg: Dictionary = LevelsData.LEVELS[0]["config"]
	var small: Dictionary = FieldSize.apply(cfg, "small")
	assert_eq(int(small["cols"]), 9)
	assert_eq(int(small["rows"]), 5)
	assert_eq(int(small["entrance"]["row"]), 2)
	assert_eq(int(small["ritual"]["col"]), 4)
	assert_ne(small, cfg)
	var large: Dictionary = FieldSize.apply(cfg, "large")
	assert_eq(int(large["cols"]), 14)
	assert_eq(int(large["rows"]), 9)
	assert_eq(int(large["entrance"]["row"]), 4)
	assert_eq(int(large["ritual"]["col"]), 7)


func test_save_roundtrip_and_defaults():
	assert_eq(SaveStore.load_save(TMP_SAVE), {"version": 1, "unlockedLevels": 1})
	SaveStore.save_progress(3, TMP_SAVE)
	assert_eq(SaveStore.load_save(TMP_SAVE), {"version": 1, "unlockedLevels": 3})
	SaveStore.reset_save(TMP_SAVE)
	assert_eq(SaveStore.load_save(TMP_SAVE)["unlockedLevels"], 1)


func test_corrupt_or_invalid_saves_fall_back_to_default():
	var f := FileAccess.open(TMP_SAVE, FileAccess.WRITE)
	f.store_string("{not json at all")
	f.close()
	assert_eq(SaveStore.load_save(TMP_SAVE), {"version": 1, "unlockedLevels": 1})
	f = FileAccess.open(TMP_SAVE, FileAccess.WRITE)
	f.store_string(JSON.stringify({"version": 2, "unlockedLevels": 4}))
	f.close()
	assert_eq(SaveStore.load_save(TMP_SAVE)["unlockedLevels"], 1)
	f = FileAccess.open(TMP_SAVE, FileAccess.WRITE)
	f.store_string(JSON.stringify({"version": 1, "unlockedLevels": 0}))
	f.close()
	assert_eq(SaveStore.load_save(TMP_SAVE)["unlockedLevels"], 1)


func test_field_size_pref_roundtrip():
	assert_eq(SaveStore.load_field_size(TMP_SIZE), "medium")
	SaveStore.store_field_size("large", TMP_SIZE)
	assert_eq(SaveStore.load_field_size(TMP_SIZE), "large")
	var f := FileAccess.open(TMP_SIZE, FileAccess.WRITE)
	f.store_string("gigantic")
	f.close()
	assert_eq(SaveStore.load_field_size(TMP_SIZE), "medium")


func test_menu_boots_then_start_level_disposes_it():
	var ctrl = load("res://scripts/game_controller.gd").new()
	get_tree().root.add_child(ctrl)
	await get_tree().process_frame
	await get_tree().process_frame
	assert_false(ctrl.started)
	assert_true(is_instance_valid(ctrl.menu))
	assert_eq(ctrl.menu.unlocked_levels, SaveStore.load_save()["unlockedLevels"])
	ctrl._start_level(0)
	await get_tree().process_frame
	assert_true(ctrl.started)
	assert_true(not is_instance_valid(ctrl.menu) or ctrl.menu.is_queued_for_deletion(), "menu should be gone after start")
	assert_true(is_instance_valid(ctrl.game))
	assert_true(is_instance_valid(ctrl.hud))
	ctrl.queue_free()
	await get_tree().process_frame


func test_size_change_updates_controller_state():
	var ctrl = load("res://scripts/game_controller.gd").new()
	get_tree().root.add_child(ctrl)
	await get_tree().process_frame
	await get_tree().process_frame
	ctrl.menu._on_size("small")
	assert_eq(ctrl.field_size, "small")
	ctrl.queue_free()
	await get_tree().process_frame
