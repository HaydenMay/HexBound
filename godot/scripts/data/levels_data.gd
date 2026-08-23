# GENERATED from TypeScript sources by tools/export-data.mjs - do not hand-edit.
class_name LevelsData

const FIELD_SIZES := [
	"small",
	"medium",
	"large"
]

const LEVELS := [
	{
		"id": "l1",
		"name": "First Circle",
		"blurb": "A small rite under a curious moon.",
		"config": {
			"cols": 11,
			"rows": 7,
			"entrance": {
				"col": 0,
				"row": 3
			},
			"ritual": {
				"col": 5,
				"row": 3
			},
			"startEssence": 150,
			"startStability": 10,
			"waves": [
				{
					"groups": [
						{
							"enemy": "militia",
							"count": 6,
							"interval": 1.4,
							"delay": 1
						}
					],
					"reward": 20
				},
				{
					"groups": [
						{
							"enemy": "militia",
							"count": 9,
							"interval": 1.2,
							"delay": 1
						},
						{
							"enemy": "runner",
							"count": 4,
							"interval": 1.4,
							"delay": 5
						}
					],
					"reward": 26
				},
				{
					"groups": [
						{
							"enemy": "knight",
							"count": 2,
							"interval": 3.5,
							"delay": 2
						},
						{
							"enemy": "militia",
							"count": 8,
							"interval": 1.1,
							"delay": 1
						}
					],
					"reward": 32
				},
				{
					"groups": [
						{
							"enemy": "hunter",
							"count": 2,
							"interval": 2.5,
							"delay": 2
						},
						{
							"enemy": "militia",
							"count": 10,
							"interval": 0.9,
							"delay": 1
						},
						{
							"enemy": "runner",
							"count": 8,
							"interval": 1,
							"delay": 6
						}
					],
					"reward": 40
				}
			]
		}
	},
	{
		"id": "l2",
		"name": "Hunter's Vigil",
		"blurb": "They come to break your walls.",
		"config": {
			"cols": 13,
			"rows": 9,
			"entrance": {
				"col": 0,
				"row": 4
			},
			"ritual": {
				"col": 6,
				"row": 4
			},
			"startEssence": 160,
			"startStability": 10,
			"waves": [
				{
					"groups": [
						{
							"enemy": "militia",
							"count": 8,
							"interval": 1.2,
							"delay": 1
						}
					],
					"reward": 22
				},
				{
					"groups": [
						{
							"enemy": "hunter",
							"count": 3,
							"interval": 2.2,
							"delay": 2
						},
						{
							"enemy": "militia",
							"count": 8,
							"interval": 1.1,
							"delay": 1
						}
					],
					"reward": 30
				},
				{
					"groups": [
						{
							"enemy": "knight",
							"count": 3,
							"interval": 3,
							"delay": 2
						},
						{
							"enemy": "runner",
							"count": 8,
							"interval": 1,
							"delay": 5
						}
					],
					"reward": 34
				},
				{
					"groups": [
						{
							"enemy": "hunter",
							"count": 4,
							"interval": 1.8,
							"delay": 2
						},
						{
							"enemy": "militia",
							"count": 12,
							"interval": 0.9,
							"delay": 1
						},
						{
							"enemy": "priest",
							"count": 2,
							"interval": 3,
							"delay": 10
						}
					],
					"reward": 42
				},
				{
					"groups": [
						{
							"enemy": "knight",
							"count": 4,
							"interval": 2.5,
							"delay": 2
						},
						{
							"enemy": "hunter",
							"count": 4,
							"interval": 1.6,
							"delay": 6
						},
						{
							"enemy": "runner",
							"count": 10,
							"interval": 0.8,
							"delay": 3
						}
					],
					"reward": 55
				}
			]
		}
	},
	{
		"id": "l3",
		"name": "Blessed March",
		"blurb": "Priests march at their front.",
		"config": {
			"cols": 15,
			"rows": 10,
			"entrance": {
				"col": 0,
				"row": 5
			},
			"ritual": {
				"col": 7,
				"row": 5
			},
			"startEssence": 170,
			"startStability": 10,
			"waves": [
				{
					"groups": [
						{
							"enemy": "militia",
							"count": 8,
							"interval": 1.1,
							"delay": 1
						},
						{
							"enemy": "priest",
							"count": 2,
							"interval": 2.5,
							"delay": 3
						}
					],
					"reward": 24
				},
				{
					"groups": [
						{
							"enemy": "priest",
							"count": 4,
							"interval": 2,
							"delay": 2
						},
						{
							"enemy": "runner",
							"count": 10,
							"interval": 0.9,
							"delay": 4
						}
					],
					"reward": 32
				},
				{
					"groups": [
						{
							"enemy": "knight",
							"count": 5,
							"interval": 2.2,
							"delay": 2
						},
						{
							"enemy": "paladin",
							"count": 2,
							"interval": 3,
							"delay": 4
						},
						{
							"enemy": "priest",
							"count": 3,
							"interval": 2.5,
							"delay": 8
						}
					],
					"reward": 38
				},
				{
					"groups": [
						{
							"enemy": "hunter",
							"count": 5,
							"interval": 1.6,
							"delay": 2
						},
						{
							"enemy": "militia",
							"count": 14,
							"interval": 0.8,
							"delay": 1
						}
					],
					"reward": 46
				},
				{
					"groups": [
						{
							"enemy": "priest",
							"count": 5,
							"interval": 1.8,
							"delay": 1
						},
						{
							"enemy": "paladin",
							"count": 3,
							"interval": 3.5,
							"delay": 4
						},
						{
							"enemy": "knight",
							"count": 5,
							"interval": 2.2,
							"delay": 5
						},
						{
							"enemy": "runner",
							"count": 12,
							"interval": 0.7,
							"delay": 8
						}
					],
					"reward": 60
				}
			]
		}
	},
	{
		"id": "l4",
		"name": "Arcane Purge",
		"blurb": "Battle mages unmake your works from afar.",
		"config": {
			"cols": 17,
			"rows": 11,
			"entrance": {
				"col": 0,
				"row": 5
			},
			"ritual": {
				"col": 8,
				"row": 5
			},
			"startEssence": 180,
			"startStability": 12,
			"waves": [
				{
					"groups": [
						{
							"enemy": "mage",
							"count": 3,
							"interval": 2.5,
							"delay": 2
						},
						{
							"enemy": "militia",
							"count": 10,
							"interval": 1,
							"delay": 1
						}
					],
					"reward": 28
				},
				{
					"groups": [
						{
							"enemy": "mage",
							"count": 4,
							"interval": 2.2,
							"delay": 2
						},
						{
							"enemy": "knight",
							"count": 4,
							"interval": 2.4,
							"delay": 5
						}
					],
					"reward": 36
				},
				{
					"groups": [
						{
							"enemy": "priest",
							"count": 4,
							"interval": 2,
							"delay": 2
						},
						{
							"enemy": "mage",
							"count": 4,
							"interval": 2,
							"delay": 7
						}
					],
					"reward": 44
				},
				{
					"groups": [
						{
							"enemy": "mage",
							"count": 6,
							"interval": 1.8,
							"delay": 2
						},
						{
							"enemy": "hunter",
							"count": 5,
							"interval": 1.6,
							"delay": 6
						},
						{
							"enemy": "inquisitor",
							"count": 1,
							"interval": 1,
							"delay": 7
						}
					],
					"reward": 52
				},
				{
					"groups": [
						{
							"enemy": "knight",
							"count": 6,
							"interval": 2,
							"delay": 2
						},
						{
							"enemy": "mage",
							"count": 5,
							"interval": 1.8,
							"delay": 8
						},
						{
							"enemy": "runner",
							"count": 14,
							"interval": 0.7,
							"delay": 4
						},
						{
							"enemy": "inquisitor",
							"count": 2,
							"interval": 5,
							"delay": 9
						}
					],
					"reward": 66
				}
			]
		}
	},
	{
		"id": "l5",
		"name": "The Grand Assault",
		"blurb": "Everything they have, all at once.",
		"config": {
			"cols": 19,
			"rows": 12,
			"entrance": {
				"col": 0,
				"row": 6
			},
			"ritual": {
				"col": 9,
				"row": 6
			},
			"startEssence": 200,
			"startStability": 12,
			"waves": [
				{
					"groups": [
						{
							"enemy": "militia",
							"count": 12,
							"interval": 0.9,
							"delay": 1
						},
						{
							"enemy": "runner",
							"count": 8,
							"interval": 1,
							"delay": 5
						}
					],
					"reward": 30
				},
				{
					"groups": [
						{
							"enemy": "knight",
							"count": 5,
							"interval": 2.2,
							"delay": 2
						},
						{
							"enemy": "paladin",
							"count": 2,
							"interval": 3,
							"delay": 5
						},
						{
							"enemy": "priest",
							"count": 3,
							"interval": 2.4,
							"delay": 6
						}
					],
					"reward": 38
				},
				{
					"groups": [
						{
							"enemy": "hunter",
							"count": 6,
							"interval": 1.5,
							"delay": 2
						},
						{
							"enemy": "mage",
							"count": 4,
							"interval": 2,
							"delay": 7
						},
						{
							"enemy": "militia",
							"count": 14,
							"interval": 0.8,
							"delay": 1
						}
					],
					"reward": 48
				},
				{
					"groups": [
						{
							"enemy": "priest",
							"count": 6,
							"interval": 1.7,
							"delay": 1
						},
						{
							"enemy": "runner",
							"count": 16,
							"interval": 0.7,
							"delay": 5
						},
						{
							"enemy": "inquisitor",
							"count": 2,
							"interval": 6,
							"delay": 6
						}
					],
					"reward": 56
				},
				{
					"groups": [
						{
							"enemy": "knight",
							"count": 8,
							"interval": 1.8,
							"delay": 2
						},
						{
							"enemy": "mage",
							"count": 6,
							"interval": 1.7,
							"delay": 8
						}
					],
					"reward": 64
				},
				{
					"groups": [
						{
							"enemy": "grandinquisitor",
							"count": 1,
							"interval": 1,
							"delay": 6
						},
						{
							"enemy": "hunter",
							"count": 8,
							"interval": 1.3,
							"delay": 2
						},
						{
							"enemy": "priest",
							"count": 6,
							"interval": 1.7,
							"delay": 7
						},
						{
							"enemy": "militia",
							"count": 18,
							"interval": 0.6,
							"delay": 1
						}
					],
					"reward": 74
				},
				{
					"groups": [
						{
							"enemy": "knight",
							"count": 10,
							"interval": 1.6,
							"delay": 2
						},
						{
							"enemy": "runner",
							"count": 20,
							"interval": 0.6,
							"delay": 6
						},
						{
							"enemy": "mage",
							"count": 8,
							"interval": 1.5,
							"delay": 12
						}
					],
					"reward": 88
				},
				{
					"groups": [
						{
							"enemy": "militia",
							"count": 24,
							"interval": 0.5,
							"delay": 1
						},
						{
							"enemy": "knight",
							"count": 10,
							"interval": 1.5,
							"delay": 4
						},
						{
							"enemy": "hunter",
							"count": 8,
							"interval": 1.3,
							"delay": 10
						},
						{
							"enemy": "mage",
							"count": 8,
							"interval": 1.4,
							"delay": 14
						},
						{
							"enemy": "priest",
							"count": 6,
							"interval": 1.6,
							"delay": 18
						},
						{
							"enemy": "grandinquisitor",
							"count": 2,
							"interval": 15,
							"delay": 20
						}
					],
					"reward": 120
				}
			]
		}
	}
]

const SIZE_FACTORS := {"small": 0.72, "large": 1.28}


static func apply_size(config: Dictionary, size: String) -> Dictionary:
	if size == "medium":
		return config
	assert(FIELD_SIZES.has(size))
	var f: float = SIZE_FACTORS[size]
	var cols: int = maxi(9, int(round(float(config["cols"]) * f)))
	var rows: int = maxi(5, int(round(float(config["rows"]) * f)))
	var mid_row := rows / 2
	var out: Dictionary = config.duplicate(true)
	out["cols"] = cols
	out["rows"] = rows
	out["entrance"] = {"col": 0, "row": mid_row}
	out["ritual"] = {"col": cols / 2, "row": mid_row}
	return out
