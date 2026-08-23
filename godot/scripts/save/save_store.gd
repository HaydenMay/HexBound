class_name SaveStore

const SAVE_PATH := "user://hexbound.save.v1.json"
const SIZE_PATH := "user://hexbound.fieldSize.v1.txt"


static func load_save(path := SAVE_PATH) -> Dictionary:
	var def := {"version": 1, "unlockedLevels": 1}
	if not FileAccess.file_exists(path):
		return def
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		return def
	var text := f.get_as_text()
	f.close()
	var json := JSON.new()
	var parsed = null
	if json.parse(text) == OK:
		parsed = json.get_data()
	if typeof(parsed) != TYPE_DICTIONARY:
		return def
	if int(parsed.get("version", 0)) != 1:
		return def
	var lv = parsed.get("unlockedLevels", null)
	if lv == null or float(lv) < 1.0:
		return def
	return {"version": 1, "unlockedLevels": int(lv)}


static func save_progress(unlocked: int, path := SAVE_PATH) -> void:
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return
	f.store_string(JSON.stringify({"version": 1, "unlockedLevels": unlocked}))
	f.close()


static func reset_save(path := SAVE_PATH) -> void:
	if FileAccess.file_exists(path):
		DirAccess.open("user://").remove(path.get_file())


static func load_field_size(path := SIZE_PATH) -> String:
	if FileAccess.file_exists(path):
		var f := FileAccess.open(path, FileAccess.READ)
		if f != null:
			var v := f.get_as_text().strip_edges()
			if LevelsData.FIELD_SIZES.has(v):
				return v
	return "medium"


static func store_field_size(size: String, path := SIZE_PATH) -> void:
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return
	f.store_string(size)
	f.close()
