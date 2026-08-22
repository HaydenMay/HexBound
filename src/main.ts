import { Game } from './sim/game'
import { ENEMY_DEFS } from './data/enemies'
import { STRUCTURE_DEFS, STRUCTURE_ORDER } from './data/structures'
import { createLevelOneConfig } from './data/level1'
import { Renderer } from './render/renderer'
import { Hud } from './ui/hud'

const game = new Game(createLevelOneConfig(), { enemies: ENEMY_DEFS, structures: STRUCTURE_DEFS })
const input = { selectedDefId: null as string | null }
const controls = { speed: 1, paused: false }

const canvas = document.getElementById('game') as HTMLCanvasElement
const renderer = new Renderer(canvas, game, input)
const hud = new Hud(game, input, controls, () => renderer.refreshSelection())

renderer.onTap = hex => {
  const defId = input.selectedDefId
  if (!defId || game.phase === 'won' || game.phase === 'lost') return
  const res = game.canPlace(defId, hex)
  if (!res.ok) {
    hud.warn(res.reason)
    return
  }
  game.place(defId, hex)
}

window.addEventListener('keydown', e => {
  const idx = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code)
  if (idx >= 0 && STRUCTURE_ORDER[idx]) hud.selectDef(STRUCTURE_ORDER[idx])
  else if (e.code === 'Escape') hud.selectDef(null)
  else if (e.code === 'KeyP') controls.paused = !controls.paused
  else if (e.code === 'Space') {
    e.preventDefault()
    if (game.phase === 'building') game.startWave()
    else controls.paused = !controls.paused
  }
})

const SIM_STEP = 1 / 30
let last = performance.now()
let acc = 0

function frame(now: number): void {
  const dtReal = Math.min((now - last) / 1000, 0.25)
  last = now
  acc += dtReal * (controls.paused ? 0 : controls.speed)
  let guard = 0
  while (acc >= SIM_STEP && guard++ < 10) {
    game.update(SIM_STEP)
    acc -= SIM_STEP
  }
  if (acc > SIM_STEP) acc = 0
  renderer.update(dtReal)
  hud.update()
  renderer.render()
  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
