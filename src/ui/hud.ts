import { Game } from '../sim/game'
import type { StructureInstance } from '../sim/structures'
import type { PlaceError } from '../sim/types'
import { STRUCTURE_DEFS, STRUCTURE_ORDER } from '../data/structures'
import { ENEMY_DEFS } from '../data/enemies'

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
  private previewEl: HTMLElement
  private inspectEl: HTMLElement
  private inspectBodyEl: HTMLElement
  private inspectTitleEl: HTMLElement

  private selectedStructure: StructureInstance | null = null
  private previewKey = ''
  private inspectKey = ''

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
    this.previewEl = this.require('#wavepreview')
    this.inspectEl = this.require('#inspect')
    this.inspectBodyEl = this.require('#inspect-body')
    this.inspectTitleEl = this.require('#inspect-title')

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
    this.require('#inspect-close').addEventListener('click', () => this.showStructure(null))

    game.events.on<number>('waveStarted', n => this.announce(`Wave ${n}`))
    game.events.on<number>('waveCleared', n => this.announce(`Wave ${n} cleared`))
    game.events.on('enemyBreached', () => this.flashVignette())
    game.events.on<StructureInstance>('structureDestroyed', s => {
      if (this.selectedStructure === s) this.showStructure(null)
    })
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

  showStructure(inst: StructureInstance | null): void {
    this.selectedStructure = inst
    this.inspectKey = ''
    if (!inst) {
      this.inspectEl.classList.add('hidden')
      return
    }
    this.inspectEl.classList.remove('hidden')
    this.renderInspect()
  }

  private renderInspect(): void {
    const inst = this.selectedStructure
    if (!inst) return
    const tier = inst.def.tiers[inst.tierIndex]
    const fork = inst.forkId ? tier.forks?.find(f => f.id === inst.forkId) : null
    const shown = fork ?? tier
    const key = `${inst.hex.col},${inst.hex.row}:${inst.tierIndex}:${inst.forkId ?? ''}`
    if (key !== this.inspectKey) {
      this.inspectKey = key
      this.inspectTitleEl.textContent = `${inst.def.name} — ${shown.label}`
      const opts = this.game.upgradeOptions(inst)
      let buttons: string
      if (opts.forks) {
        buttons = opts.forks
          .map(
            f => `<button class="upgrade-btn" data-fork="${f.id}" data-cost="${f.cost}">
              <span class="up-label">${f.label}</span>
              <span class="up-desc">${f.desc}</span>
              <span class="up-cost">${f.cost} essence</span>
            </button>`
          )
          .join('')
      } else if (opts.next) {
        buttons = `<button class="upgrade-btn" data-fork="" data-cost="${opts.next.cost}">
          <span class="up-label">${opts.next.label}</span>
          <span class="up-desc">${opts.next.desc}</span>
          <span class="up-cost">${opts.next.cost} essence</span>
        </button>`
      } else {
        buttons = `<div class="upgrade-max">Fully empowered</div>`
      }
      this.inspectBodyEl.innerHTML = `
        <div class="inspect-tier">${shown.desc}</div>
        <div class="inspect-hp">Structure integrity: <span id="inspect-hp-val"></span></div>
        <div class="upgrade-list">${buttons}</div>`
      this.inspectBodyEl.querySelectorAll<HTMLButtonElement>('.upgrade-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!this.selectedStructure) return
          const res = this.game.upgrade(this.selectedStructure, btn.dataset.fork || undefined)
          if (res === 'unaffordable') this.warn('unaffordable')
          if (res === 'ok') this.renderInspect()
        })
      })
    }
    const hpVal = this.require('#inspect-hp-val')
    hpVal.textContent = `${Math.max(Math.ceil(inst.hp), 0)} / ${inst.maxHp}`
    this.inspectBodyEl.querySelectorAll<HTMLButtonElement>('.upgrade-btn').forEach(btn => {
      btn.disabled = this.game.essence < Number(btn.dataset.cost ?? 0)
    })
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
      if (this.selectedStructure) this.renderInspect()
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
      this.renderPreview()
    }

    if (this.selectedStructure) this.renderInspect()

    const speedLabel = `${this.controls.speed}x`
    if (this.speedBtn.textContent !== speedLabel) this.speedBtn.textContent = speedLabel
    const pauseLabel = this.controls.paused ? 'Resume' : 'Pause'
    if (this.pauseBtn.textContent !== pauseLabel) this.pauseBtn.textContent = pauseLabel
  }

  private renderPreview(): void {
    const g = this.game
    const wave = g.nextWavePreview()
    if (!wave) {
      this.previewKey = ''
      this.previewEl.innerHTML = ''
      return
    }
    const key = String(g.waveIndex)
    if (key === this.previewKey) return
    this.previewKey = key
    this.previewEl.innerHTML = wave.groups
      .map(gr => {
        const def = ENEMY_DEFS[gr.enemy]
        const hex = `#${def.color.toString(16).padStart(6, '0')}`
        return `<span class="chip"><i style="background:${hex}"></i>${gr.count}&times; ${def.name}</span>`
      })
      .join('')
  }
}
