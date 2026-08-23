class_name BreachAudio
extends RefCounted

const SAMPLE_RATE := 22050

static var _stream: AudioStreamWAV = null
static var _player: AudioStreamPlayer = null


static func play(parent: Node) -> void:
	if _stream == null:
		_stream = _build()
	if _player == null or not is_instance_valid(_player):
		_player = AudioStreamPlayer.new()
		_player.stream = _stream
		_player.bus = "Master"
		parent.add_child(_player)
	_player.play()


static func _build() -> AudioStreamWAV:
	var tone_len := int(SAMPLE_RATE * 0.55)
	var noise_len := int(SAMPLE_RATE * 0.18)
	var n := maxi(tone_len, noise_len)
	var data := PackedByteArray()
	data.resize(n * 2)
	for i in n:
		var t := float(i) / SAMPLE_RATE
		var v := 0.0
		if i < tone_len:
			var freq: float = lerpf(220.0, 50.0, minf(t / 0.45, 1.0))
			var env: float = clampf(lerpf(0.5, 0.001, t / 0.55), 0.001, 0.5)
			v += sin(TAU * freq * t) * env
		if i < noise_len:
			v += (randf() * 2.0 - 1.0) * (1.0 - float(i) / noise_len) * 0.25
		var s := int(clampf(v, -1.0, 1.0) * 32767.0)
		data.encode_s16(i * 2, s)
	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = SAMPLE_RATE
	wav.stereo = false
	wav.data = data
	return wav
