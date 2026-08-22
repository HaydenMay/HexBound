import { Game } from './sim/game'
import type { GameConfig } from './sim/types'
import { ENEMY_DEFS } from './data/enemies'
import { STRUCTURE_DEFS, STRUCTURE_ORDER } from './data/structures'
import { LEVELS } from './data/levels'
import { loadSave, resetSave, saveProgress } from './save/save'
import { Renderer } from './render/renderer'
import { Hud } from './ui/hud'
import { LabelLayer } from './ui/labels'
import { lerpHexToWorld } from './sim/hex'

function showFatal(message: string): void {
  const overlay = document.getElementById('overlay')
  const title = document.getElementById('overlay-title')
  const sub = document.getElementById('overlay-sub')
  if (!overlay || !title || !sub) return
  overlay.classList.remove('hidden')
  title.textContent = 'The ritual falters'
  sub.textContent = message
}

function buildMenu(listEl: HTMLElement, unlockedLevels: number, onPick: (index: number) => void): void {
  listEl.innerHTML = ''
  LEVELS.forEach((lvl, i) => {
    const locked = i + 1 > unlockedLevels
    const btn = document.createElement('button')
    btn.className = 'level-btn' + (locked ? ' locked' : '')
    btn.innerHTML = `
      <span class="lv-num">${i + 1}</span>
      <span class="lv-name">${lvl.name}</span>
      <span class="lv-blurb">${locked ? 'Sealed by the hunters' : lvl.blurb}</span>`
    btn.disabled = locked
    btn.addEventListener('click', () => onPick(i))
    listEl.appendChild(btn)
  })
}

try {
  const save = loadSave()
  const menuEl = document.getElementById('menu') as HTMLElement
  const listEl = document.getElementById('level-list') as HTMLElement
  let started = false

  function startLevel(levelIndex: number, config: GameConfig): void {
    if (started) return
    started = true
    menuEl.classList.add('hidden')

    const game = new Game(config, { enemies: ENEMY_DEFS, structures: STRUCTURE_DEFS })
    const input = { selectedDefId: null as string | null }
    const controls = { speed: 1, paused: false }

    const canvas = document.getElementById('game') as HTMLCanvasElement
    const renderer = new Renderer(canvas, game, input)
    const hud = new Hud(game, input, controls, () => renderer.refreshSelection())
    const labels = new LabelLayer(document.getElementById('labels') as HTMLElement)

    renderer.onTap = hex => {
      const inst = game.structureAt(hex)
      if (inst) {
        hud.showStructure(inst)
        renderer.setSelected(inst)
        return
      }
      const defId = input.selectedDefId
      if (defId) {
        const res = game.canPlace(defId, hex)
        if (!res.ok) {
          hud.warn(res.reason)
          return
        }
        game.place(defId, hex)
        return
      }
      hud.showStructure(null)
      renderer.setSelected(null)
    }

    window.addEventListener('keydown', e => {
      const idx = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9'].indexOf(e.code)
      if (idx >= 0 && STRUCTURE_ORDER[idx]) hud.selectDef(STRUCTURE_ORDER[idx])
      else if (e.code === 'Escape') {
        hud.selectDef(null)
        hud.showStructure(null)
        renderer.setSelected(null)
      } else if (e.code === 'KeyP') controls.paused = !controls.paused
      else if (e.code === 'Space') {
        e.preventDefault()
        if (game.phase === 'building') game.startWave()
        else controls.paused = !controls.paused
      }
    })

    game.events.on('won', () => {
      saveProgress(Math.max(save.unlockedLevels, levelIndex + 2))
      save.unlockedLevels = Math.max(save.unlockedLevels, levelIndex + 2)
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

      const items = []
      for (const e of game.enemies) {
        if (!e.def.traitName || !e.revealed) continue
        const w = lerpHexToWorld(e.cur, e.next, e.t)
        const sp = renderer.projectPoint(w)
        items.push({ text: e.def.traitName, x: sp.x, y: sp.y - 14, visible: sp.visible })
      }
      labels.update(items)

      renderer.render()
      requestAnimationFrame(frame)
    }

    requestAnimationFrame(frame)

    ;(window as unknown as Record<string, unknown>).__hexboundGame = game
    ;(window as unknown as Record<string, unknown>).__hexboundRenderer = renderer
  }

  buildMenu(listEl, save.unlockedLevels, i => startLevel(i, LEVELS[i].config))

  document.getElementById('reset-save')?.addEventListener('click', () => {
    resetSave()
    save.unlockedLevels = 1
    buildMenu(listEl, save.unlockedLevels, i => startLevel(i, LEVELS[i].config))
  })
} catch (err) {
  console.error(err)
  const webglFail = err instanceof Error && /webgl|context/i.test(err.message)
  showFatal(
    webglFail
      ? 'HexBound needs WebGL to run. Try another browser or enable hardware acceleration.'
      : `Something went wrong starting the game: ${err instanceof Error ? err.message : String(err)}`
  )
}
