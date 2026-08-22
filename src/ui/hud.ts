import { Game } from '../sim/game'
import type { PlaceError } from '../sim/types'
import { STRUCTURE_DEFS, STRUCTURE_ORDER } from '../data/structures'

export interface Controls {
  speed: number
  paused: boolean
}

const WARN_TEXT: Record<PlaceError, string> = {
  sealed: 'THE CIRCLE MUST REMAIN REACHABLE',
  unaffordable: 'NOT ENOUGH ESSENCE',
  blocked: 'CANNOT BUILD THERE'
}

export class Hud {
  private essenceEl: HTMLElement
  private waveEl: HTMLElement
  private fillEl: HTMLElement
  private ritualLabelEl: HTMLElement
  private stabilityEl: HTMLElement[]
  private paletteCards = new Map<string, HTMLButtonElement>()
  private startBtn: HTMLButtonElement
  private pauseBtn: HTMLButtonElement
  private speedBtn: HTMLButtonElement
  private bannerEl: HTMLElement
  private bannerTimer = 0
  private vignetteEl: HTMLElement
  private vignetteTimer = 0
  private overlayEl: HTMLElement

  private cache = { essence: -1, wave: '', progress: -1, stability: -1, phase: '' }

  constructor(
    private game: Game,
    private input: { selectedDefId: string | null },
    private controls: Controls,
    private onSelectionChanged: () => void
  ) {
    this.essenceEl = this.require('#essence-value')
    this.waveEl = this.require('#wave-value')
    this.fillEl = this.require('#ritual-fill')
    this.ritualLabelEl = this.require('#ritual-label')
    this.startBtn = this.require('#startwave') as HTMLButtonElement
    this.pauseBtn = this.require('#pause') as HTMLButtonElement
    this.speedBtn = this.require('#speed') as HTMLButtonElement
    this.bannerEl = this.require('#banner')
    this.vignetteEl = this.require('#vignette')
    this.overlayEl = this.require('#overlay')

    const stabWrap = this.require('#stability')
    this.stabilityEl = []
    for (let i = 0; i < game.maxStability; i++) {
      const pip = document.createElement('span')
      pip.className = 'pip'
      stabWrap.appendChild(pip)
      this.stabilityEl.push(pip)
    }

    const palette = this.require('#palette')
    STRUCTURE_ORDER.forEach((id, i) => {
      const def = STRUCTURE_DEFS[id]
      const card = document.createElement('button')
      card.className = 'card'
      card.dataset.def = id
      card.innerHTML = `
        <span class="card-key">${i + 1}</span>
        <span class="card-name">${def.name}</span>
        <span class="card-cost">${def.cost} essence</span>
        <span class="card-blurb">${def.blurb}</span>`
      card.addEventListener('click', () => this.selectDef(id))
      palette.appendChild(card)
      this.paletteCards.set(id, card)
    })

    this.startBtn.addEventListener('click', () => game.startWave())
    this.pauseBtn.addEventListener('click', () => {
      controls.paused = !controls.paused
    })
    this.speedBtn.addEventListener('click', () => {
      controls.speed = controls.speed >= 3 ? 1 : controls.speed + 1
    })
    this.require('#restart').addEventListener('click', () => window.location.reload())

    game.events.on<number>('waveStarted', n => this.announce(`Wave ${n}`))
    game.events.on<number>('waveCleared', n => this.announce(`Wave ${n} complete`))
    game.events.on('enemyBreached', () => this.flashVignette())
    game.events.on('won', () => this.showEnd(true))
    game.events.on('lost', () => this.showEnd(false))

    this.syncPalette()
  }

  private require(sel: string): HTMLElement {
    const el = document.querySelector(sel)
    if (!el) throw new Error(`missing hud element ${sel}`)
    return el as HTMLElement
  }

  selectDef(id: string | null): void {
    this.input.selectedDefId = id
    this.syncPalette()
    this.onSelectionChanged()
  }

  private syncPalette(): void {
    for (const [id, card] of this.paletteCards) {
      card.classList.toggle('selected', this.input.selectedDefId === id)
    }
  }

  warn(reason: PlaceError): void {
    this.showBanner(WARN_TEXT[reason], true)
  }

  private announce(text: string): void {
    this.showBanner(text, false)
  }

  private showBanner(text: string, danger: boolean): void {
    this.bannerEl.textContent = text
    this.bannerEl.classList.toggle('danger', danger)
    this.bannerEl.classList.add('show')
    window.clearTimeout(this.bannerTimer)
    this.bannerTimer = window.setTimeout(() => this.bannerEl.classList.remove('show'), 1900)
  }

  private flashVignette(): void {
    this.vignetteEl.classList.add('hit')
    window.clearTimeout(this.vignetteTimer)
    this.vignetteTimer = window.setTimeout(() => this.vignetteEl.classList.remove('hit'), 320)
  }

  private showEnd(win: boolean): void {
    const title = this.require('#overlay-title')
    const sub = this.require('#overlay-sub')
    title.textContent = win ? 'The Ritual Is Complete' : 'The Circle Is Broken'
    sub.textContent = win
      ? 'Your forbidden working succeeds. The coven grows stronger.'
      : 'The hunters have shattered your working. The night belongs to them.'
    this.overlayEl.classList.remove('hidden')
  }

  update(): void {
    const g = this.game
    const essence = Math.floor(g.essence)
    const progress = Math.round(g.progress * 10) / 10
    const phaseKey = `${g.phase}:${g.waveIndex}`

    if (this.cache.essence !== essence) {
      this.cache.essence = essence
      this.essenceEl.textContent = String(essence)
      for (const [id, card] of this.paletteCards) {
        card.classList.toggle('poor', essence < STRUCTURE_DEFS[id].cost)
      }
    }

    const waveText =
      g.phase === 'active' ? `Wave ${g.currentWave} / ${g.totalWaves}` : `Next: Wave ${g.currentWave} / ${g.totalWaves}`
    if (this.cache.wave !== waveText) {
      this.cache.wave = waveText
      this.waveEl.textContent = waveText
    }

    if (this.cache.progress !== progress) {
      this.cache.progress = progress
      this.fillEl.style.width = `${progress}%`
      this.ritualLabelEl.textContent = `Ritual ${Math.floor(progress)}%`
    }

    if (this.cache.stability !== g.stability) {
      this.cache.stability = g.stability
      this.stabilityEl.forEach((pip, i) => pip.classList.toggle('out', i >= g.stability))
    }

    if (this.cache.phase !== phaseKey) {
      this.cache.phase = phaseKey
      const ended = g.phase === 'won' || g.phase === 'lost'
      this.startBtn.classList.toggle('hidden', g.phase !== 'building' || ended)
      if (g.phase === 'building') {
        this.startBtn.textContent = `Begin Wave ${g.currentWave}`
        this.pauseBtn.disabled = false
      } else {
        this.pauseBtn.disabled = ended
      }
    }

    const speedLabel = `${this.controls.speed}x`
    if (this.speedBtn.textContent !== speedLabel) this.speedBtn.textContent = speedLabel
    const pauseLabel = this.controls.paused ? 'Resume' : 'Pause'
    if (this.pauseBtn.textContent !== pauseLabel) this.pauseBtn.textContent = pauseLabel
  }
}
