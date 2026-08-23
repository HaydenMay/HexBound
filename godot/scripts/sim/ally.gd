class_name SimAlly
extends RefCounted

static var next_id := 1

var id: int
var dps: float
var remaining: float
var attack_radius: float
var hex: Dictionary
var owner_id := ""
var attack_cooldown := 0.0


func _init(p_dps: float, duration: float, p_radius: float, p_hex: Dictionary) -> void:
	id = SimAlly.next_id
	SimAlly.next_id += 1
	dps = p_dps
	remaining = duration
	attack_radius = p_radius
	hex = {"col": int(p_hex["col"]), "row": int(p_hex["row"])}
