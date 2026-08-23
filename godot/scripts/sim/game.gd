class_name SimGame
extends RefCounted

const ALLY_CAP := 30
const CHARM_DPS := 8.0
const CHARM_FIGHT_RADIUS := 1.8

var grid: BattlefieldGrid
var field: FlowField
var enemies: Array = []
var allies: Array = []
var structures: Array = []
var essence := 0.0
var stability := 0
var max_stability := 0
var progress := 0.0
var phase := "building"
var wave_index := 0
var events := Emitter.new()
var scouted := {}

var spawn_queue: Array = []
var clock := 0.0
var by_hex := {}
var enemy_defs: Dictionary
var structure_defs: Dictionary
var waves: Array


func _init(config: Dictionary, defs: Dictionary) -> void:
	grid = BattlefieldGrid.new(config)
	field = FlowField.new(grid)
	essence = float(config["startEssence"])
	stability = int(config["startStability"])
	max_stability = int(config["startStability"])
	waves = config["waves"]
	enemy_defs = defs["enemies"]
	structure_defs = defs["structures"]


func get_current_wave() -> int:
	return mini(wave_index + 1, waves.size())


func get_total_waves() -> int:
	return waves.size()


func next_wave_preview():
	if phase == "building" and wave_index < waves.size():
		return waves[wave_index]
	return null


static func _hex_key(hex: Dictionary) -> String:
	return "%d,%d" % [int(hex["col"]), int(hex["row"])]


func structure_at(hex: Dictionary):
	if not grid.in_bounds(hex):
		return null
	return by_hex.get(_hex_key(hex), null)


func can_place(def_id: String, hex: Dictionary) -> Dictionary:
	if not structure_defs.has(def_id) or not grid.in_bounds(hex):
		return {"ok": false, "reason": "blocked"}
	if not grid.placeable(hex):
		return {"ok": false, "reason": "blocked"}
	var def: Dictionary = structure_defs[def_id]
	if essence < float(def["cost"]):
		return {"ok": false, "reason": "unaffordable"}
	if def["blocksPath"]:
		var probe := {"defId": def_id, "hex": hex, "blocksPath": true}
		grid.set_structure(probe)
		var test := FlowField.new(grid)
		grid.remove_structure_at(hex)
		if not test.reachable(grid.entrance):
			return {"ok": false, "reason": "sealed"}
	return {"ok": true}


func place(def_id: String, hex: Dictionary) -> bool:
	var check := can_place(def_id, hex)
	if not check["ok"]:
		return false
	var def: Dictionary = structure_defs[def_id]
	essence -= float(def["cost"])
	grid.set_structure({"defId": def_id, "hex": hex, "blocksPath": def["blocksPath"]})
	var inst := StructureOps.create_structure(def, hex)
	structures.append(inst)
	by_hex[_hex_key(hex)] = inst
	after_battlefield_changed()
	events.emit("structurePlaced", inst)
	return true


func upgrade_options(inst: Dictionary) -> Dictionary:
	if inst["fork_id"] != null:
		return {}
	var tiers: Array = inst["def"]["tiers"]
	var tier: Dictionary = tiers[int(inst["tier_index"])]
	if tier.has("forks") and (tier["forks"] as Array).size() > 0:
		return {"forks": tier["forks"]}
	if int(inst["tier_index"]) + 1 < tiers.size():
		return {"next": tiers[int(inst["tier_index"]) + 1]}
	return {}


func upgrade(inst: Dictionary, fork_id := "") -> String:
	if inst["fork_id"] != null:
		return "maxed"
	var opts := upgrade_options(inst)
	var chosen: Dictionary
	var forked := false
	if opts.has("forks"):
		var fork = null
		if fork_id != "":
			for f in opts["forks"]:
				if f["id"] == fork_id:
					fork = f
					break
		if fork == null:
			return "invalid"
		chosen = fork
		forked = true
	elif opts.has("next"):
		chosen = opts["next"]
	else:
		return "maxed"
	var cost := int(chosen["cost"])
	if essence < cost:
		return "unaffordable"
	essence -= cost
	inst["invested"] = int(inst["invested"]) + cost
	if forked:
		inst["fork_id"] = chosen["id"]
	else:
		inst["tier_index"] = int(inst["tier_index"]) + 1
	if chosen.has("hp"):
		inst["max_hp"] = float(chosen["hp"])
		inst["hp"] = float(chosen["hp"])
	if StructureOps.kind_stats(inst)["kind"] == "grove":
		after_battlefield_changed()
	events.emit("structureUpgraded", inst)
	return "ok"


func refund_for(inst: Dictionary) -> int:
	if inst["destroyed"]:
		return 0
	if inst["contributed"]:
		return int(inst["invested"]) * 2 / 3
	return int(inst["invested"])


func sell_structure(inst: Dictionary) -> int:
	if inst["destroyed"]:
		return 0
	if phase != "building":
		return 0
	var refund := refund_for(inst)
	essence += refund
	inst["sold"] = true
	destroy_structure(inst)
	return refund


func damage_enemy(e: SimEnemy, amount: float, type: String) -> void:
	var mult := 1.0
	if e.def.get("weakness", "") == type:
		for s in structures:
			if s["destroyed"]:
				continue
			var stats := StructureOps.kind_stats(s)
			if stats["kind"] != "eye":
				continue
			if HexLib.hex_distance(s["hex"], e.cur) <= float(StructureOps.current_tier(s)["radius"]):
				mult = maxf(mult, 1.0 + float(stats["eye"]["ampBonus"]))
	e.hp -= amount * mult


func start_wave() -> void:
	if phase != "building":
		return
	if wave_index >= waves.size():
		return
	var wave: Dictionary = waves[wave_index]
	for g in wave["groups"]:
		for i in int(g["count"]):
			spawn_queue.append({"enemy": g["enemy"], "at": float(g["delay"]) + i * float(g["interval"])})
	spawn_queue.sort_custom(func(a, b): return a["at"] < b["at"])
	clock = 0.0
	phase = "active"
	events.emit("waveStarted", get_current_wave())


func update(dt: float) -> void:
	if phase == "won" or phase == "lost":
		return

	if phase == "active":
		clock += dt
		while spawn_queue.size() > 0 and float(spawn_queue[0]["at"]) <= clock:
			var entry: Dictionary = spawn_queue.pop_front()
			var e := SimEnemy.new(enemy_defs[entry["enemy"]], grid.entrance)
			enemies.append(e)
			events.emit("enemySpawned", e)

	apply_cauldrons(dt)
	apply_idols(dt)
	apply_totems(dt)
	apply_wells(dt)
	apply_allies(dt)
	apply_structure_attacks(dt)
	apply_groves()
	apply_foe_abilities(dt)
	apply_eyes()

	var breaches: Array = []
	for e in enemies:
		e.tick_effects(dt)
		if e.charmed_by != null:
			e.charm_remaining -= dt
			if e.charm_remaining <= 0.0:
				e.charmed_by = null
			else:
				var foe = nearest_foe_for(e)
				if foe != null:
					foe.hp -= CHARM_DPS * dt
				continue
		if e.hp > 0.0 and e.attacking_hex == null:
			var result = e.advance(dt, func(c): return field.next_step(c))
			if result == "arrived":
				breaches.append(e)

	compact_enemies(breaches)

	if stability <= 0:
		stability = 0
		phase = "lost"
		events.emit("lost")
		return

	if phase == "active" and spawn_queue.is_empty() and enemies.is_empty():
		var wave: Dictionary = waves[wave_index]
		essence += float(wave["reward"])
		progress = float(wave_index + 1) / float(waves.size()) * 100.0
		events.emit("waveCleared", get_current_wave())
		wave_index += 1
		if wave_index >= waves.size():
			phase = "won"
			events.emit("won")
		else:
			phase = "building"


func nearest_foe_for(charmed: SimEnemy):
	var best = null
	var bd := INF
	for e in enemies:
		if e == charmed or e.charmed_by != null or e.hp <= 0.0:
			continue
		var d := HexLib.hex_distance(charmed.cur, e.cur)
		if d <= CHARM_FIGHT_RADIUS and d < bd:
			bd = d
			best = e
	return best


func apply_idols(dt: float) -> void:
	for s in structures:
		var stats := StructureOps.kind_stats(s)
		if stats["kind"] != "idol":
			continue
		if float(s["disabled"]) > 0.0:
			continue
		var idol: Dictionary = stats["idol"]
		s["cooldown"] = float(s["cooldown"]) - dt
		if float(s["cooldown"]) > 0.0:
			continue
		var key := _hex_key(s["hex"])
		var owned := 0
		for e in enemies:
			if e.charmed_by == key:
				owned += 1
		if owned >= int(idol["concurrent"]):
			continue
		var radius := float(StructureOps.current_tier(s)["radius"])
		var target = null
		var target_d := INF
		for e in enemies:
			if e.charmed_by != null or e.def.get("charmImmune", false) \
					or HexLib.hex_distance(s["hex"], e.cur) > radius:
				continue
			var d := HexLib.hex_distance(s["hex"], e.cur)
			if d < target_d:
				target_d = d
				target = e
		if target == null:
			continue
		target.charmed_by = key
		target.charm_remaining = float(idol["duration"])
		target.poison_stacks = 0
		target.poison_remaining = 0.0
		target.attacking_hex = null
		s["cooldown"] = float(idol["cooldown"])
		s["contributed"] = true
		var to := HexLib.lerp_hex_to_world(target.cur, target.next, target.t)
		events.emit("lightning", {"color": 0xc08aff, "points": [HexLib.hex_to_world(s["hex"]), to]})
		events.emit("enemyCharmed", target)


func apply_wells(dt: float) -> void:
	for s in structures:
		if StructureOps.kind_stats(s)["kind"] != "well":
			continue
		s["cooldown"] = float(s["cooldown"]) - dt


func sacrifice(inst: Dictionary) -> bool:
	var stats := StructureOps.kind_stats(inst)
	if stats["kind"] != "well":
		return false
	if float(inst["disabled"]) > 0.0 or float(inst["cooldown"]) > 0.0 or allies.is_empty():
		return false
	var nearest = allies[0]
	var bd := INF
	for a in allies:
		var d := HexLib.hex_distance(inst["hex"], a.hex)
		if d < bd:
			bd = d
			nearest = a
	allies.erase(nearest)
	var well: Dictionary = stats["well"]
	inst["cooldown"] = float(well["sacrificeCooldown"])
	inst["contributed"] = true
	for e in enemies:
		if e.charmed_by == null and HexLib.hex_distance(inst["hex"], e.cur) <= float(well["sacrificeRadius"]):
			damage_enemy(e, float(well["sacrificeDamage"]), "burst")
	events.emit("nova", {
		"pos": HexLib.hex_to_world(inst["hex"]),
		"radius": float(well["sacrificeRadius"]),
		"color": 0x8ad8ff
	})
	return true


func apply_cauldrons(dt: float) -> void:
	for e in enemies:
		e.in_aura = false
	var cauldron = first_cauldron_stats()
	if cauldron == null:
		return
	for s in structures:
		if StructureOps.kind_stats(s)["kind"] != "cauldron":
			continue
		if float(s["disabled"]) > 0.0:
			continue
		var radius := float(StructureOps.current_tier(s)["radius"])
		for e in enemies:
			if not e.in_aura and e.charmed_by == null \
					and HexLib.hex_distance(s["hex"], e.cur) <= radius:
				e.in_aura = true
				s["contributed"] = true
	for e in enemies:
		if e.in_aura:
			if e.poison_stacks < int(cauldron["maxStacks"]):
				e.stack_progress += dt
				if e.stack_progress >= float(cauldron["stackInterval"]):
					e.stack_progress -= float(cauldron["stackInterval"])
					var resist: float = float(e.def.get("curseResist", 0.0))
					if randf() >= resist:
						gain_poison(e, cauldron)
			else:
				e.poison_remaining = float(cauldron["stackDuration"])
		if e.poison_stacks > 0 and e.poison_remaining > 0.0:
			e.poisoned_time += dt
			var dps := float(e.poison_stacks) * float(cauldron["dpsPerStack"])
			if cauldron.has("frenzyPerSec"):
				dps *= 1.0 + float(cauldron["frenzyPerSec"]) * e.poisoned_time
			damage_enemy(e, dps * dt, "poison")


func gain_poison(source: SimEnemy, cauldron: Dictionary) -> void:
	source.poison_stacks = mini(source.poison_stacks + 1, int(cauldron["maxStacks"]))
	source.poison_remaining = float(cauldron["stackDuration"])
	if not cauldron.has("spreadRadius"):
		return
	for other in enemies:
		if other == source or other.poison_stacks >= int(cauldron["maxStacks"]):
			continue
		if HexLib.hex_distance(source.cur, other.cur) <= float(cauldron["spreadRadius"]):
			other.poison_stacks += 1
			other.poison_remaining = float(cauldron["stackDuration"])


func first_cauldron_stats():
	for s in structures:
		var stats := StructureOps.kind_stats(s)
		if stats["kind"] == "cauldron":
			return stats["cauldron"]
	return null


func apply_totems(dt: float) -> void:
	for s in structures:
		var stats := StructureOps.kind_stats(s)
		if stats["kind"] != "totem":
			continue
		if float(s["disabled"]) > 0.0:
			continue
		var totem: Dictionary = stats["totem"]
		s["cooldown"] = float(s["cooldown"]) - dt
		if float(s["cooldown"]) > 0.0:
			continue
		var range_r := float(StructureOps.current_tier(s)["radius"])
		var in_range: Array = []
		for e in enemies:
			if e.charmed_by == null and HexLib.hex_distance(s["hex"], e.cur) <= range_r:
				in_range.append(e)
		in_range.sort_custom(func(a, b): return HexLib.hex_distance(a.cur, s["hex"]) < HexLib.hex_distance(b.cur, s["hex"]))
		if in_range.is_empty():
			continue
		var hit: Array = [in_range[0]]
		var last = in_range[0]
		while hit.size() < int(totem["maxTargets"]):
			var best = null
			var bd := INF
			for e in in_range:
				if hit.has(e):
					continue
				var d := HexLib.hex_distance(last.cur, e.cur)
				if d <= float(totem["chainRange"]) and d < bd:
					bd = d
					best = e
			if best == null:
				break
			hit.append(best)
			last = best
		for e in hit:
			damage_enemy(e, float(totem["damage"]), "shock")
		s["cooldown"] = float(totem["cooldown"])
		s["contributed"] = true
		var points: Array = [HexLib.hex_to_world(s["hex"])]
		for e in hit:
			points.append(HexLib.lerp_hex_to_world(e.cur, e.next, e.t))
		events.emit("lightning", {"color": 0xcfeaff, "points": points})


func apply_allies(dt: float) -> void:
	for a in allies:
		a.remaining -= dt
		a.attack_cooldown -= dt
		var best = null
		var bd := INF
		for e in enemies:
			if e.charmed_by != null:
				continue
			var d := HexLib.hex_distance(a.hex, e.cur)
			if d <= a.attack_radius and d < bd:
				bd = d
				best = e
		if best == null:
			continue
		damage_enemy(best, a.dps * dt, "poison")
		if a.attack_cooldown <= 0.0:
			a.attack_cooldown = 0.4
			events.emit("lightning", {
				"color": 0x76e8b0,
				"points": [HexLib.hex_to_world(a.hex), HexLib.lerp_hex_to_world(best.cur, best.next, best.t)]
			})
	allies = allies.filter(func(a): return a.remaining > 0.0)


func apply_structure_attacks(dt: float) -> void:
	for e in enemies:
		var sd := float(e.def.get("structureDamage", 0.0))
		if sd == 0.0 or e.hp <= 0.0 or e.charmed_by != null:
			e.attacking_hex = null
			continue
		var range_r := float(e.def.get("structureRange", 1.15))
		var best = null
		var bd := INF
		for s in structures:
			if not s["def"].get("structureTarget", false):
				continue
			var d := HexLib.hex_distance(e.cur, s["hex"])
			if d <= range_r and d < bd:
				bd = d
				best = s
		if best == null:
			e.attacking_hex = null
		else:
			e.attacking_hex = {"col": best["hex"]["col"], "row": best["hex"]["row"]}
		if best == null:
			continue
		best["hp"] = float(best["hp"]) - sd * dt
		best["contributed"] = true

		e.vfx_clock += dt
		if e.vfx_clock >= 0.5:
			e.vfx_clock = 0.0
			events.emit("lightning", {
				"color": 0xff6a5a,
				"points": [HexLib.lerp_hex_to_world(e.cur, e.next, e.t), HexLib.hex_to_world(best["hex"])]
			})

		if float(best["hp"]) <= 0.0:
			if not best["destroyed"]:
				destroy_structure(best)
			continue

		var stats := StructureOps.kind_stats(best)
		if stats["kind"] == "mirror" and randf() < float(stats["mirror"]["reflectChance"]):
			e.hp -= sd * float(stats["mirror"]["reflectFactor"])
			best["contributed"] = true
			events.emit("lightning", {
				"color": 0xf0f0ff,
				"points": [HexLib.hex_to_world(best["hex"]), HexLib.lerp_hex_to_world(e.cur, e.next, e.t)]
			})


func destroy_structure(s: Dictionary) -> void:
	s["destroyed"] = true
	structures.erase(s)
	by_hex.erase(_hex_key(s["hex"]))
	grid.remove_structure_at(s["hex"])
	after_battlefield_changed()
	events.emit("structureDestroyed", s)


func compact_enemies(breaches: Array) -> void:
	var survivors: Array = []
	for e in enemies:
		if e.hp <= 0.0:
			essence += float(e.def["reward"])
			apply_well_deaths(e.cur)
			try_raise_ally(e.cur)
			events.emit("enemyDied", e)
			continue
		if breaches.has(e):
			stability -= int(e.def["ritualDamage"])
			events.emit("enemyBreached", e)
			continue
		survivors.append(e)
	enemies = survivors


func apply_well_deaths(hex: Dictionary) -> void:
	for s in structures:
		var stats := StructureOps.kind_stats(s)
		if stats["kind"] != "well":
			continue
		if HexLib.hex_distance(s["hex"], hex) <= float(StructureOps.current_tier(s)["radius"]):
			essence += float(stats["well"]["essencePerDeath"])
			s["contributed"] = true


func apply_groves() -> void:
	for s in structures:
		if bool(s["contributed"]) or StructureOps.kind_stats(s)["kind"] != "grove":
			continue
		var radius := float(StructureOps.current_tier(s)["radius"])
		for e in enemies:
			if e.charmed_by == null and HexLib.hex_distance(s["hex"], e.cur) <= radius:
				s["contributed"] = true
				break


func apply_foe_abilities(dt: float) -> void:
	for s in structures:
		if float(s["disabled"]) > 0.0:
			s["disabled"] = float(s["disabled"]) - dt
	var summoned: Array = []
	for e in enemies:
		var d: Dictionary = e.def
		if d.has("cleanse"):
			var cleanse: Dictionary = d["cleanse"]
			e.cleanse_clock += dt
			if e.cleanse_clock >= float(cleanse["interval"]):
				e.cleanse_clock = fmod(e.cleanse_clock, float(cleanse["interval"]))
				var cleaned := false
				for o in enemies:
					if o == e or float(o.poison_remaining) <= 0.0:
						continue
					if HexLib.hex_distance(e.cur, o.cur) <= float(cleanse["radius"]):
						o.poison_stacks = 0
						o.poison_remaining = 0.0
						o.stack_progress = 0.0
						cleaned = true
				if cleaned:
					events.emit("nova", {
						"pos": HexLib.lerp_hex_to_world(e.cur, e.next, e.t),
						"radius": float(cleanse["radius"]),
						"color": 0xfff0c0
					})
		if d.has("silence"):
			var silence: Dictionary = d["silence"]
			e.silence_clock += dt
			if e.silence_clock >= float(silence["interval"]):
				e.silence_clock = fmod(e.silence_clock, float(silence["interval"]))
				for s in structures:
					if s["destroyed"] or float(s["disabled"]) > 0.0:
						continue
					var kind: String = StructureOps.kind_stats(s)["kind"]
					if kind != "cauldron" and kind != "totem" and kind != "idol" and kind != "ring" and kind != "well":
						continue
					if HexLib.hex_distance(e.cur, s["hex"]) <= float(silence["radius"]):
						s["disabled"] = maxf(float(s["disabled"]), float(silence["duration"]))
						events.emit("nova", {"pos": HexLib.hex_to_world(s["hex"]), "radius": 1.2, "color": 0xffd060})
		if d.has("summon"):
			var summon: Dictionary = d["summon"]
			e.summon_clock += dt
			if e.summon_clock >= float(summon["interval"]):
				e.summon_clock = fmod(e.summon_clock, float(summon["interval"]))
				for i in int(summon["count"]):
					summoned.append(SimEnemy.new(enemy_defs[summon["enemy"]], grid.entrance))
				events.emit("nova", {"pos": HexLib.hex_to_world(grid.entrance), "radius": 1.5, "color": 0xc05a4a})
	for s in summoned:
		enemies.append(s)
		events.emit("enemySpawned", s)


func apply_eyes() -> void:
	for s in structures:
		if s["destroyed"]:
			continue
		if StructureOps.kind_stats(s)["kind"] != "eye":
			continue
		var radius := float(StructureOps.current_tier(s)["radius"])
		for e in enemies:
			if not scouted.has(e.def["id"]) and HexLib.hex_distance(s["hex"], e.cur) <= radius:
				scouted[e.def["id"]] = true
				events.emit("traitRevealed", e.def["id"])


func try_raise_ally(hex: Dictionary) -> void:
	if allies.size() >= ALLY_CAP:
		return
	for s in structures:
		if float(s["disabled"]) > 0.0:
			continue
		var stats := StructureOps.kind_stats(s)
		if stats["kind"] != "ring":
			continue
		var ring: Dictionary = stats["ring"]
		if HexLib.hex_distance(s["hex"], hex) > float(StructureOps.current_tier(s)["radius"]):
			continue
		var key := _hex_key(s["hex"])
		var owned := 0
		for a in allies:
			if a.owner_id == key:
				owned += 1
		if owned >= int(ring["maxActive"]):
			continue
		if randf() < float(ring["raiseChance"]):
			var ally := SimAlly.new(float(ring["dps"]), float(ring["duration"]), float(ring["attackRadius"]), hex)
			ally.owner_id = key
			allies.append(ally)
			s["contributed"] = true
		break


func after_battlefield_changed() -> void:
	rebuild_penalties()
	field = FlowField.new(grid)
	events.emit("fieldChanged")


func rebuild_penalties() -> void:
	grid.reset_penalties()
	for s in structures:
		var stats := StructureOps.kind_stats(s)
		if stats["kind"] == "grove":
			grid.add_penalty(s["hex"], int(StructureOps.current_tier(s)["radius"]), float(stats["grove"]["costPenalty"]))
