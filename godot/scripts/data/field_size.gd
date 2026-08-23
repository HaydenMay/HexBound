class_name FieldSize

const FACTORS := {"small": 0.72, "medium": 1.0, "large": 1.28}


static func apply(config: Dictionary, size: String) -> Dictionary:
	if size == "medium":
		return config
	var f: float = FACTORS[size]
	var cols: int = maxi(9, _js_round(float(config["cols"]) * f))
	var rows: int = maxi(5, _js_round(float(config["rows"]) * f))
	var mid_row := rows / 2
	var out := config.duplicate(true)
	out["cols"] = cols
	out["rows"] = rows
	out["entrance"] = {"col": 0, "row": mid_row}
	out["ritual"] = {"col": cols / 2, "row": mid_row}
	return out


static func _js_round(v: float) -> int:
	return int(floorf(v + 0.5))
