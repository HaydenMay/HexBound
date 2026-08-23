# GENERATED from TypeScript sources by tools/export-data.mjs - do not hand-edit.
class_name EnemiesData

const DEFS := {
	"militia": {
		"id": "militia",
		"name": "Militia",
		"hp": 40,
		"speed": 1.1,
		"reward": 8,
		"ritualDamage": 1,
		"scale": 1,
		"color": 12606026,
		"weakness": "poison"
	},
	"runner": {
		"id": "runner",
		"name": "Runner",
		"hp": 22,
		"speed": 2.1,
		"reward": 6,
		"ritualDamage": 1,
		"scale": 0.7,
		"color": 14258239,
		"weakness": "poison"
	},
	"knight": {
		"id": "knight",
		"name": "Knight",
		"hp": 150,
		"speed": 0.75,
		"reward": 16,
		"ritualDamage": 2,
		"scale": 1.15,
		"color": 9082029,
		"weakness": "shock"
	},
	"priest": {
		"id": "priest",
		"name": "Priest",
		"hp": 60,
		"speed": 1,
		"reward": 12,
		"ritualDamage": 1,
		"scale": 1,
		"color": 15787720,
		"curseResist": 0.8,
		"weakness": "burst"
	},
	"hunter": {
		"id": "hunter",
		"name": "Witch Hunter",
		"hp": 55,
		"speed": 1.25,
		"reward": 12,
		"ritualDamage": 1,
		"scale": 0.9,
		"color": 11553386,
		"structureDamage": 10,
		"weakness": "poison"
	},
	"mage": {
		"id": "mage",
		"name": "Battle Mage",
		"hp": 45,
		"speed": 1,
		"reward": 14,
		"ritualDamage": 1,
		"scale": 0.85,
		"color": 8036336,
		"structureDamage": 7,
		"structureRange": 3,
		"weakness": "shock"
	},
	"paladin": {
		"id": "paladin",
		"name": "Paladin",
		"hp": 130,
		"speed": 0.85,
		"reward": 18,
		"ritualDamage": 2,
		"scale": 1.2,
		"color": 15255648,
		"curseResist": 0.6,
		"weakness": "burst",
		"cleanse": {
			"radius": 2,
			"interval": 3.5
		},
		"intro": {
			"title": "PALADIN MARCHES WITH THEM",
			"lines": [
				"Her blessing strips curses from nearby allies.",
				"But she cannot cleanse herself - rot her directly."
			]
		}
	},
	"inquisitor": {
		"id": "inquisitor",
		"name": "Elite Inquisitor",
		"hp": 180,
		"speed": 0.8,
		"reward": 24,
		"ritualDamage": 2,
		"scale": 1.25,
		"color": 10104896,
		"charmImmune": true,
		"structureDamage": 14,
		"weakness": "poison",
		"silence": {
			"radius": 2.5,
			"interval": 5,
			"duration": 2.5
		},
		"intro": {
			"title": "AN ELITE INQUISITOR ADVANCES",
			"lines": [
				"His will cannot be bent - immune to charm.",
				"His bell silences your works. Silvered glass ignores it."
			]
		}
	},
	"grandinquisitor": {
		"id": "grandinquisitor",
		"name": "The Grand Inquisitor",
		"hp": 950,
		"speed": 0.55,
		"reward": 120,
		"ritualDamage": 6,
		"scale": 2.1,
		"color": 14200896,
		"charmImmune": true,
		"curseResist": 0.5,
		"boss": true,
		"weakness": "shock",
		"silence": {
			"radius": 3.5,
			"interval": 8,
			"duration": 3
		},
		"summon": {
			"enemy": "militia",
			"count": 3,
			"interval": 7
		},
		"intro": {
			"title": "THE GRAND INQUISITOR",
			"lines": [
				"His faith cannot be twisted - immune to charm.",
				"Curses sear him only half as deep.",
				"His great bell silences your towers.",
				"He calls reinforcements to his side."
			]
		}
	}
}
