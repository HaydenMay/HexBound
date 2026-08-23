import { Game } from '../sim/game'
import { kindStats, type StructureInstance } from '../sim/structures'
import type { PlaceError } from '../sim/types'
import { STRUCTURE_DEFS, STRUCTURE_ORDER } from '../data/structures'
import { ENEMY_DEFS } from '../data/enemies'
import { Enemy } from '../sim/enemy'

export interface Controls {
  speed: number
  paused: boolean
}

const WARN_TEXT: Record<PlaceError, string> = {
  sealed: 'THE CIRCLE MUST REMAIN REACHABLE',
  unaffordable: 'NOT ENOUGH ESSENCE',
  blocked: 'CANNOT BUILD THERE'
}

function weaknessLabel(w: 'poison' | 'shock' | 'burst'): string {
  return w.charAt(0).toUpperCase() + w.slice(1)
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
  private placeHintEl: HTMLElement
  private enemyInspectEl: HTMLElement
  private enemyBodyEl: HTMLElement
  private enemyTitleEl: HTMLElement
  private bossIntroEl: HTMLElement

  private selectedStructure: StructureInstance | null = null
  private selectedEnemyId: number | null = null
  private previewKey = ''
  private inspectKey = ''
  private enemyKey = ''
  private introTimer = 0

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
    this.placeHintEl = this.require('#placehint')
    this.enemyInspectEl = this.require('#enemy-inspect')
    this.enemyBodyEl = this.require('#enemy-body')
    this.enemyTitleEl = this.require('#enemy-title')
    this.bossIntroEl = this.require('#bossintro')
    this.require('#enemy-close').addEventListener('click', () => this.showEnemy(null))

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
        <span class="card-name"><span class="card-gem" style="--k:#${def.color.toString(16).padStart(6, '0')}"></span>${def.name}</span>
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
      this.showBanner(`Your ${s.def.name} was shattered!`, true)
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

  setPending(hex: { col: number; row: number } | null): void {
    if (hex) {
      this.placeHintEl.textContent = 'Tap the glowing hex again to conjure'
      this.placeHintEl.classList.add('show')
    } else {
      this.placeHintEl.classList.remove('show')
    }
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

  showEnemy(enemy: Enemy | null): void {
    this.selectedEnemyId = enemy ? enemy.id : null
    this.enemyKey = ''
    if (!enemy) {
      this.enemyInspectEl.classList.add('hidden')
      return
    }
    this.enemyInspectEl.classList.remove('hidden')
    this.renderEnemyInspect()
  }

  private renderEnemyInspect(): void {
    const live = this.game.enemies.find(e => e.id === this.selectedEnemyId)
    if (!live) {
      this.showEnemy(null)
      return
    }
    const key = `${live.id}:${Math.ceil(live.hp)}`
    if (key === this.enemyKey) return
    this.enemyKey = key
    this.enemyTitleEl.textContent = live.def.name
    const tags: string[] = []
    if ((live.def.curseResist ?? 0) >= 0.5) tags.push('curse-proof')
    if (live.def.charmImmune) tags.push('uncharmable')
    if (live.def.silence) tags.push('silencer')
    if (live.def.cleanse) tags.push('cleanser')
    if (live.def.summon) tags.push('summoner')
    if (live.def.structureDamage) tags.push('wallbreaker')
    const weakness = this.game.scouted.has(live.def.id)
      ? `Weak: ${weaknessLabel(live.def.weakness ?? 'poison')}`
      : 'Weakness: ??? — scout with the Watching Eye'
    this.enemyBodyEl.innerHTML = `
      <div class="inspect-hp">Vitality: <span>${Math.max(Math.ceil(live.hp), 0)} / ${live.def.hp}</span></div>
      ${tags.length ? `<div class="tag-row">${tags.map(t => `<span class="tag-chip">${t}</span>`).join('')}</div>` : ''}
      <div class="enemy-weakness">${weakness}</div>`
  }

  showIntro(title: string, lines: string[]): void {
    this.bossIntroEl.innerHTML = `<div class="intro-title">${title}</div>${lines
      .map(l => `<div class="intro-line">${l}</div>`)
      .join('')}`
    this.bossIntroEl.classList.add('show')
    window.clearTimeout(this.introTimer)
    this.introTimer = window.setTimeout(() => this.bossIntroEl.classList.remove('show'), 5000)
  }

  private renderInspect(): void {
    const inst = this.selectedStructure
    if (!inst) return
    const tier = inst.def.tiers[inst.tierIndex]
    const fork = inst.forkId ? tier.forks?.find(f => f.id === inst.forkId) : null
    const shown = fork ?? tier
    const stats = kindStats(inst)
    const key = `${inst.hex.col},${inst.hex.row}:${inst.tierIndex}:${inst.forkId ?? ''}:${inst.contributed ? 1 : 0}`
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
      let sacrificeBlock = ''
      if (stats.kind === 'well') {
        sacrificeBlock = `<button class="upgrade-btn" id="sacrifice-btn">
          <span class="up-label">Sacrifice Sprite</span>
          <span class="up-desc">${stats.well.sacrificeDamage} burst around the well</span>
          <span class="up-cost" id="sacrifice-state"></span>
        </button>`
      }
      const refund = this.game.refundFor(inst)
      const sellBlock = `<button class="upgrade-btn sell-btn" id="sell-btn">
        <span class="up-label">Dismantle</span>
        <span class="up-desc">${inst.contributed ? 'It has served — partial return' : 'Untouched — full return'}</span>
        <span class="up-cost">+${refund} essence</span>
      </button>`
      this.inspectBodyEl.innerHTML = `
        <div class="inspect-tier">${shown.desc}</div>
        <div class="inspect-hp">Structure integrity: <span id="inspect-hp-val"></span></div>
        <div class="upgrade-list">${buttons}${sacrificeBlock}${sellBlock}</div>`
      this.inspectBodyEl.querySelectorAll<HTMLButtonElement>('.upgrade-btn[data-fork]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!this.selectedStructure) return
          const res = this.game.upgrade(this.selectedStructure, btn.dataset.fork || undefined)
          if (res === 'unaffordable') this.warn('unaffordable')
          if (res === 'ok') this.renderInspect()
        })
      })
      this.inspectBodyEl.querySelector('#sacrifice-btn')?.addEventListener('click', () => {
        if (!this.selectedStructure) return
        if (!this.game.sacrifice(this.selectedStructure)) this.showBanner('The well is not ready', true)
      })
      this.inspectBodyEl.querySelector('#sell-btn')?.addEventListener('click', () => {
        if (!this.selectedStructure) return
        this.game.sellStructure(this.selectedStructure)
      })
    }
    const hpVal = this.require('#inspect-hp-val')
    hpVal.textContent = `${Math.max(Math.ceil(inst.hp), 0)} / ${inst.maxHp}`
    this.inspectBodyEl.querySelectorAll<HTMLButtonElement>('.upgrade-btn[data-fork]').forEach(btn => {
      btn.disabled = this.game.essence < Number(btn.dataset.cost ?? 0)
    })
    const sacBtn = this.inspectBodyEl.querySelector<HTMLButtonElement>('#sacrifice-btn')
    if (sacBtn && stats.kind === 'well') {
      const ready = inst.cooldown <= 0 && this.game.allies.length > 0
      sacBtn.disabled = !ready
      const state = sacBtn.querySelector('#sacrifice-state')
      if (state) {
        state.textContent = !this.game.allies.length
          ? 'no sprites bound'
          : inst.cooldown > 0
            ? `recharging ${Math.ceil(inst.cooldown)}s`
            : `${this.game.allies.length} sprite(s) ready`
      }
    }
    const sellBtn = this.inspectBodyEl.querySelector<HTMLButtonElement>('#sell-btn')
    if (sellBtn) {
      const locked = this.game.phase !== 'building'
      sellBtn.disabled = locked
      const desc = sellBtn.querySelector('.up-desc')
      if (desc) {
        desc.textContent = locked
          ? 'The circle is sealed while foes march'
          : inst.contributed
            ? 'It has served — partial return'
            : 'Untouched — full return'
      }
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
    if (this.selectedStructure) this.renderInspect()
    if (this.selectedEnemyId !== null) this.renderEnemyInspect()
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
