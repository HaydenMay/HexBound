import { Game } from './sim/game'
import type { Enemy } from './sim/enemy'
import type { GameConfig } from './sim/types'
import type { HexCoord } from './sim/hex'
import type { InputState } from './render/renderer'
import { ENEMY_DEFS } from './data/enemies'
import { STRUCTURE_DEFS, STRUCTURE_ORDER } from './data/structures'
import { LEVELS, applySize, FIELD_SIZES, type FieldSize } from './data/levels'
import { loadSave, resetSave, saveProgress } from './save/save'
import { Renderer } from './render/renderer'
import { Hud } from './ui/hud'

const SIZE_KEY = 'hexbound.fieldSize.v1'

function loadFieldSize(): FieldSize {
  try {
    const v = globalThis.localStorage?.getItem(SIZE_KEY)
    if (v && (FIELD_SIZES as string[]).includes(v)) return v as FieldSize
  } catch {
    // storage unavailable, fall through to default
  }
  return 'medium'
}

function storeFieldSize(size: FieldSize): void {
  try {
    globalThis.localStorage?.setItem(SIZE_KEY, size)
  } catch {
    // non-fatal: preference simply won't persist
  }
}

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

  let fieldSize = loadFieldSize()
  const sizeBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('#size-picker .size-btn'))
  function paintFieldSize(): void {
    for (const btn of sizeBtns) btn.classList.toggle('selected', btn.dataset.size === fieldSize)
  }
  paintFieldSize()
  sizeBtns.forEach(btn =>
    btn.addEventListener('click', () => {
      const size = btn.dataset.size as FieldSize | undefined
      if (!size || started || size === fieldSize) return
      fieldSize = size
      storeFieldSize(size)
      paintFieldSize()
    })
  )

  function startLevel(levelIndex: number, config: GameConfig): void {
    if (started) return
    started = true
    menuEl.classList.add('hidden')

    const game = new Game(config, { enemies: ENEMY_DEFS, structures: STRUCTURE_DEFS })
    const input: InputState = { selectedDefId: null, pendingHex: null }
    const controls = { speed: 1, paused: false }

    const canvas = document.getElementById('game') as HTMLCanvasElement
    const renderer = new Renderer(canvas, game, input)
    const hud = new Hud(game, input, controls, () => {
      input.pendingHex = null
      hud.setPending(null)
      renderer.refreshSelection()
    })

    renderer.onTap = (hex, source, enemy) => {
      if (enemy) {
        input.pendingHex = null
        hud.setPending(null)
        hud.showStructure(null)
        renderer.setSelected(null)
        hud.showEnemy(enemy)
        return
      }
      const inst = game.structureAt(hex)
      if (inst) {
        input.pendingHex = null
        hud.setPending(null)
        hud.showEnemy(null)
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
        if (source === 'touch') {
          const p: HexCoord | null = input.pendingHex
          if (!p || p.col !== hex.col || p.row !== hex.row) {
            input.pendingHex = { ...hex }
            hud.setPending(hex)
            return
          }
        }
        input.pendingHex = null
        hud.setPending(null)
        game.place(defId, hex)
        return
      }
      input.pendingHex = null
      hud.setPending(null)
      hud.showStructure(null)
      hud.showEnemy(null)
      renderer.setSelected(null)
    }

    const seenIntro = new Set<string>()
    game.events.on<Enemy>('enemySpawned', e => {
      const intro = e.def.intro
      if (!intro) return
      if (e.def.boss || !seenIntro.has(e.def.id)) {
        hud.showIntro(intro.title, intro.lines)
        seenIntro.add(e.def.id)
      }
    })

    window.addEventListener('keydown', e => {
      const idx = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9'].indexOf(e.code)
      if (idx >= 0 && STRUCTURE_ORDER[idx]) hud.selectDef(STRUCTURE_ORDER[idx])
      else if (e.code === 'Escape') {
        input.pendingHex = null
        hud.setPending(null)
        hud.selectDef(null)
        hud.showStructure(null)
        hud.showEnemy(null)
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
      renderer.render()
      requestAnimationFrame(frame)
    }

    requestAnimationFrame(frame)

    ;(window as unknown as Record<string, unknown>).__hexboundGame = game
    ;(window as unknown as Record<string, unknown>).__hexboundRenderer = renderer
  }

  buildMenu(listEl, save.unlockedLevels, i => startLevel(i, applySize(LEVELS[i].config, fieldSize)))

  document.getElementById('reset-save')?.addEventListener('click', () => {
    resetSave()
    save.unlockedLevels = 1
    buildMenu(listEl, save.unlockedLevels, i => startLevel(i, applySize(LEVELS[i].config, fieldSize)))
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
