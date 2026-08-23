class_name Emitter
extends RefCounted

var listeners := {}


func on(name: String, fn: Callable) -> void:
	if not listeners.has(name):
		listeners[name] = []
	listeners[name].append(fn)


func emit(name: String, payload = null) -> void:
	if not listeners.has(name):
		return
	for fn in listeners[name].duplicate():
		fn.call(payload)
