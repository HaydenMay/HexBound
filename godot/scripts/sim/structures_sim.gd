class_name StructureOps


static func create_structure(def: Dictionary, hex: Dictionary) -> Dictionary:
	var base: Dictionary = def["tiers"][0]
	var cd := 0.0
	if base["kind"] == "totem":
		cd = float(base["totem"]["cooldown"]) * 0.5
	return {
		"def": def,
		"hex": {"col": int(hex["col"]), "row": int(hex["row"])},
		"cooldown": cd,
		"hp": float(def["hp"]),
		"max_hp": float(def["hp"]),
		"tier_index": 0,
		"fork_id": null,
		"destroyed": false,
		"invested": int(def["cost"]),
		"contributed": false,
		"sold": false,
		"disabled": 0.0
	}


static func current_tier(inst: Dictionary) -> Dictionary:
	var tiers: Array = inst["def"]["tiers"]
	var tier: Dictionary = tiers[int(inst["tier_index"])]
	if inst["fork_id"] != null:
		if tier.has("forks"):
			for f in tier["forks"]:
				if f["id"] == inst["fork_id"]:
					return f
	return tier


static func kind_stats(inst: Dictionary) -> Dictionary:
	var t := current_tier(inst)
	var kind: String = t["kind"]
	match kind:
		"cauldron":
			return {"kind": "cauldron", "cauldron": t["cauldron"]}
		"totem":
			return {"kind": "totem", "totem": t["totem"]}
		"grove":
			return {"kind": "grove", "grove": t["grove"]}
		"ring":
			return {"kind": "ring", "ring": t["ring"]}
		"idol":
			return {"kind": "idol", "idol": t["idol"]}
		"well":
			return {"kind": "well", "well": t["well"]}
		"mirror":
			return {"kind": "mirror", "mirror": t["mirror"]}
		"eye":
			return {"kind": "eye", "eye": t["eye"]}
	return {"kind": "wall"}
