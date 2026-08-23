class_name SimEnemy
extends RefCounted

static var next_id := 1

var id: int
var def: Dictionary
var hp: float
var cur: Dictionary
var next = null
var t := 0.0
var poison_stacks := 0
var poison_remaining := 0.0
var poisoned_time := 0.0
var stack_progress := 0.0
var in_aura := false
var attacking_hex = null
var charmed_by = null
var charm_remaining := 0.0
var vfx_clock := 0.0
var cleanse_clock := 0.0
var silence_clock := 0.0
var summon_clock := 0.0


func _init(p_def: Dictionary, spawn: Dictionary) -> void:
	def = p_def
	id = SimEnemy.next_id
	SimEnemy.next_id += 1
	hp = float(def["hp"])
	cur = {"col": int(spawn["col"]), "row": int(spawn["row"])}


func tick_effects(dt: float) -> void:
	if poison_remaining > 0.0:
		poison_remaining -= dt
		if poison_remaining <= 0.0:
			poison_stacks = 0
			stack_progress = 0.0


func advance(dt: float, next_step_fn: Callable) -> String:
	if next == null:
		var n = next_step_fn.call(cur)
		if n == null:
			return "arrived"
		next = n
	t += float(def["speed"]) * dt
	if t >= 1.0:
		cur = next
		next = null
		t = 0.0
	return "walking"
