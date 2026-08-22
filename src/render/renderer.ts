import * as THREE from 'three'
import { Game, type LightningPayload, type TeleportPayload } from '../sim/game'
import { currentTier, type StructureInstance } from '../sim/structures'
import { HEX_SIZE, hexToWorld, lerpHexToWorld, worldToHex, type HexCoord, type WorldPos } from '../sim/hex'
import type { KindStats } from '../sim/types'
import { STRUCTURE_DEFS } from '../data/structures'

const VALID_COLOR = 0x7fe3a0
const INVALID_COLOR = 0xff5a5a
const POISON_COLOR = 0x76c958

export interface ScreenPoint {
  x: number
  y: number
  visible: boolean
}

export class Renderer {
  onTap: ((hex: HexCoord) => void) | null = null

  private webgl: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private raycaster = new THREE.Raycaster()
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

  private target: THREE.Vector3
  private dist = 22
  private keys = new Set<string>()

  private tiles: THREE.InstancedMesh
  private arrows: THREE.InstancedMesh
  private enemyMesh: THREE.InstancedMesh
  private allyMesh: THREE.InstancedMesh
  private revealMesh: THREE.InstancedMesh
  private structureGroups = new Map<string, THREE.Group>()
  private hpBars = new Map<string, { bg: THREE.Mesh; fill: THREE.Mesh }>()
  private selected: StructureInstance | null = null
  private selectRing: THREE.Mesh
  private ritualOrb!: THREE.Mesh
  private ritualRing!: THREE.MeshStandardMaterial

  private ghost: THREE.Group | null = null
  private ghostDefId: string | null = null
  private ghostHex: HexCoord | null = null
  private ghostValid = false
  private ghostRingMat: THREE.MeshBasicMaterial | null = null
  private ghostDiscMat: THREE.MeshBasicMaterial | null = null

  private lightningPool: { line: THREE.Line; life: number }[] = []
  private flashPool: { ring: THREE.Mesh; life: number }[] = []
  private poolIndex = 0
  private time = 0

  private dragging = false
  private panning = false
  private lastX = 0
  private lastY = 0
  private hoverNdc = new THREE.Vector2()
  private hasHover = false

  constructor(private canvas: HTMLCanvasElement, private game: Game, private input: { selectedDefId: string | null }) {
    this.webgl = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.webgl.setSize(canvas.clientWidth, canvas.clientHeight, false)
    this.webgl.toneMapping = THREE.ACESFilmicToneMapping
    this.webgl.toneMappingExposure = 1.15

    this.scene.background = new THREE.Color(0x0d0a16)
    this.scene.fog = new THREE.Fog(0x0d0a16, 42, 95)

    const ritualWorld = hexToWorld(game.grid.ritual)
    this.target = new THREE.Vector3(ritualWorld.x, 0, ritualWorld.z)
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200)

    const hemi = new THREE.HemisphereLight(0x9a8ac8, 0x14101f, 1.0)
    const dir = new THREE.DirectionalLight(0xfff2e0, 1.4)
    dir.position.set(12, 22, 8)
    this.scene.add(hemi, dir)

    const ground = new THREE.Mesh(new THREE.CircleGeometry(80, 48), new THREE.MeshBasicMaterial({ color: 0x120e1c }))
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.35
    this.scene.add(ground)

    const hexGeo = new THREE.CylinderGeometry(HEX_SIZE * 0.94, HEX_SIZE * 0.94, 0.24, 6)
    hexGeo.rotateY(Math.PI / 6)
    this.tiles = new THREE.InstancedMesh(hexGeo, new THREE.MeshStandardMaterial({ color: 0xffffff }), game.grid.cols * game.grid.rows)
    this.tiles.position.y = -0.12
    this.scene.add(this.tiles)

    const arrowGeo = new THREE.ConeGeometry(0.16, 0.42, 4)
    arrowGeo.rotateX(Math.PI / 2)
    this.arrows = new THREE.InstancedMesh(
      arrowGeo,
      new THREE.MeshBasicMaterial({ color: 0x6fd8c8, transparent: true, opacity: 0.38, depthWrite: false }),
      game.grid.cols * game.grid.rows
    )
    this.scene.add(this.arrows)

    this.enemyMesh = new THREE.InstancedMesh(
      new THREE.CapsuleGeometry(0.3, 0.42, 3, 10),
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
      300
    )
    this.enemyMesh.count = 0
    this.scene.add(this.enemyMesh)

    this.allyMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.2, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x1f3a2c, emissive: 0x76e8b0, emissiveIntensity: 1.6 }),
      40
    )
    this.allyMesh.count = 0
    this.scene.add(this.allyMesh)

    const revealGeo = new THREE.RingGeometry(0.48, 0.6, 24)
    revealGeo.rotateX(-Math.PI / 2)
    this.revealMesh = new THREE.InstancedMesh(
      revealGeo,
      new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.85, depthWrite: false }),
      300
    )
    this.revealMesh.count = 0
    this.scene.add(this.revealMesh)

    this.buildRitual()
    this.buildEntrance()

    const selectGeo = new THREE.RingGeometry(0.82, 0.95, 6)
    selectGeo.rotateX(-Math.PI / 2)
    selectGeo.rotateZ(Math.PI / 6)
    this.selectRing = new THREE.Mesh(
      selectGeo,
      new THREE.MeshBasicMaterial({ color: 0xb26bff, transparent: true, opacity: 0.9, depthWrite: false })
    )
    this.selectRing.position.y = 0.16
    this.selectRing.visible = false
    this.scene.add(this.selectRing)

    for (let i = 0; i < 8; i++) {
      const geo = new THREE.BufferGeometry()
      geo.setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
      const mat = new THREE.LineBasicMaterial({ color: 0xcfeaff, transparent: true, opacity: 0 })
      const line = new THREE.Line(geo, mat)
      line.frustumCulled = false
      this.scene.add(line)
      this.lightningPool.push({ line, life: 0 })
    }

    const flashGeo = new THREE.RingGeometry(0.3, 0.5, 24)
    flashGeo.rotateX(-Math.PI / 2)
    for (let i = 0; i < 6; i++) {
      const ring = new THREE.Mesh(
        flashGeo,
        new THREE.MeshBasicMaterial({ color: 0xd8aaff, transparent: true, opacity: 0, depthWrite: false })
      )
      ring.position.y = 0.2
      ring.visible = false
      this.scene.add(ring)
      this.flashPool.push({ ring, life: 0 })
    }

    for (const s of game.structures) this.addStructureMesh(s)

    this.rebuildTiles()
    this.rebuildArrows()

    game.events.on<StructureInstance>('structurePlaced', s => {
      this.addStructureMesh(s)
      this.rebuildTiles()
      this.rebuildArrows()
    })
    game.events.on<StructureInstance>('structureDestroyed', s => {
      const key = `${s.hex.col},${s.hex.row}`
      const group = this.structureGroups.get(key)
      if (group) {
        this.scene.remove(group)
        this.structureGroups.delete(key)
      }
      this.hpBars.delete(key)
      if (this.selected === s) this.setSelected(null)
      this.rebuildTiles()
      this.rebuildArrows()
    })
    game.events.on('fieldChanged', () => {
      this.rebuildArrows()
      this.rebuildTiles()
    })
    game.events.on<LightningPayload>('lightning', p => this.spawnLightning(p))
    game.events.on<TeleportPayload>('teleport', p => this.spawnFlash(p.from, p.to))

    this.bindInput()
    window.addEventListener('resize', () => this.resize())
    this.resize()
  }

  private buildRitual(): void {
    const world = hexToWorld(this.game.grid.ritual)
    const g = new THREE.Group()
    g.position.set(world.x, 0, world.z)
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.3, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x3a2f52 })
    )
    pedestal.position.y = 0.25
    const ringGeo = new THREE.TorusGeometry(0.95, 0.07, 8, 40)
    ringGeo.rotateX(-Math.PI / 2)
    this.ritualRing = new THREE.MeshStandardMaterial({ color: 0x2a1a3e, emissive: 0xb26bff, emissiveIntensity: 1.0 })
    const ring = new THREE.Mesh(ringGeo, this.ritualRing)
    ring.position.y = 0.62
    this.ritualOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 14, 14),
      new THREE.MeshStandardMaterial({ color: 0x3a2a55, emissive: 0xd8aaff, emissiveIntensity: 2.0 })
    )
    this.ritualOrb.position.y = 1.2
    g.add(pedestal, ring, this.ritualOrb)
    this.scene.add(g)
  }

  private buildEntrance(): void {
    const world = hexToWorld(this.game.grid.entrance)
    const g = new THREE.Group()
    g.position.set(world.x, 0, world.z)
    const ringGeo = new THREE.TorusGeometry(0.8, 0.06, 8, 32)
    ringGeo.rotateX(-Math.PI / 2)
    const ring = new THREE.Mesh(
      ringGeo,
      new THREE.MeshStandardMaterial({ color: 0x2a1030, emissive: 0xff5a4a, emissiveIntensity: 1.6 })
    )
    ring.position.y = 0.08
    g.add(ring)
    this.scene.add(g)
  }

  private makeStructureMesh(kind: KindStats['kind']): THREE.Group {
    const g = new THREE.Group()
    const std = (color: number, emissive = 0x000000, ei = 0) =>
      new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: ei })
    if (kind === 'cauldron') {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.4, 0.55, 10), std(0x3b2f52))
      pot.position.y = 0.28
      const brew = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.1, 10), std(0x2f4a35, 0x8cff9d, 1.4))
      brew.position.y = 0.58
      g.add(pot, brew)
    } else if (kind === 'totem') {
      const pole = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.5, 6), std(0x4a3a63))
      pole.position.y = 0.75
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), std(0x2a3a55, 0x9fd8ff, 1.8))
      orb.position.y = 1.58
      g.add(pole, orb)
    } else if (kind === 'gate') {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.22, 8), std(0x3a2f52))
      base.position.y = 0.11
      const portal = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.09, 8, 28), std(0x2a1a3e, 0xd8aaff, 1.8))
      portal.position.y = 0.85
      const core = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ color: 0x6a3aa0, transparent: true, opacity: 0.55, side: THREE.DoubleSide }))
      core.position.y = 0.85
      g.add(base, portal, core)
    } else if (kind === 'ring') {
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2
        const mx = Math.cos(angle) * 0.55
        const mz = Math.sin(angle) * 0.55
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.2, 6), std(0xd8d0c0))
        stem.position.set(mx, 0.1, mz)
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), std(0x2a4a38, 0x9dffce, 1.5))
        cap.scale.y = 0.7
        cap.position.set(mx, 0.24, mz)
        g.add(stem, cap)
      }
    } else if (kind === 'orb') {
      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 0.55, 8), std(0x3a2f52))
      pedestal.position.y = 0.28
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), std(0x4a3a20, 0xffe08a, 2.0))
      orb.position.y = 0.95
      g.add(pedestal, orb)
    } else {
      const t1 = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.95, 6), std(0x2f6b45))
      t1.position.set(-0.28, 0.47, 0.12)
      const t2 = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.72, 6), std(0x3f8f55))
      t2.position.set(0.3, 0.36, -0.18)
      const t3 = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 6), std(0x2a5a3c))
      t3.position.set(0.05, 0.28, 0.32)
      g.add(t1, t2, t3)
    }
    return g
  }

  private addStructureMesh(s: StructureInstance): void {
    const world = hexToWorld(s.hex)
    const mesh = this.makeStructureMesh(currentTier(s).kind)
    mesh.position.set(world.x, 0, world.z)
    const key = `${s.hex.col},${s.hex.row}`
    this.structureGroups.set(key, mesh)
    this.scene.add(mesh)

    const barGeo = new THREE.PlaneGeometry(1.1, 0.12)
    const bg = new THREE.Mesh(barGeo, new THREE.MeshBasicMaterial({ color: 0x14101f, transparent: true, opacity: 0.85, depthWrite: false }))
    bg.position.set(world.x, 1.85, world.z)
    const fillGeo = new THREE.PlaneGeometry(1.04, 0.07)
    const fill = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({ color: 0x7fe3a0, depthWrite: false }))
    fill.position.set(world.x, 1.85, world.z + 0.001)
    bg.visible = false
    fill.visible = false
    this.scene.add(bg, fill)
    this.hpBars.set(key, { bg, fill })
  }

  setSelected(inst: StructureInstance | null): void {
    this.selected = inst
    if (!inst) {
      this.selectRing.visible = false
      return
    }
    const world = hexToWorld(inst.hex)
    this.selectRing.position.set(world.x, 0.16, world.z)
    this.selectRing.visible = true
  }

  private rebuildTiles(): void {
    const grid = this.game.grid
    const m = new THREE.Matrix4()
    const color = new THREE.Color()
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const c = { col, row }
        const i = grid.index(c)
        m.setPosition(hexToWorld(c).x, 0, hexToWorld(c).z)
        this.tiles.setMatrixAt(i, m)
        if (grid.structureAt(c)) {
          color.setHex(0x1f1930)
        } else if (grid.penaltyAt(c) > 0) {
          color.setHex(0x27402f)
        } else if (col === grid.entrance.col && row === grid.entrance.row) {
          color.setHex(0x5a3a7a)
        } else if (col === grid.ritual.col && row === grid.ritual.row) {
          color.setHex(0x4a2a5a)
        } else {
          color.setHex(0x2b2342)
        }
        this.tiles.setColorAt(i, color)
      }
    }
    this.tiles.instanceMatrix.needsUpdate = true
    if (this.tiles.instanceColor) this.tiles.instanceColor.needsUpdate = true
  }

  private rebuildArrows(): void {
    const grid = this.game.grid
    const field = this.game.field
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const yAxis = new THREE.Vector3(0, 1, 0)
    let n = 0
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const c = { col, row }
        if (!field.reachable(c)) continue
        const next = field.nextStep(c)
        if (!next) continue
        const from = hexToWorld(c)
        const to = hexToWorld(next)
        const angle = Math.atan2(to.x - from.x, to.z - from.z)
        q.setFromAxisAngle(yAxis, angle)
        m.compose(new THREE.Vector3(from.x, 0.14, from.z), q, new THREE.Vector3(1, 1, 1))
        this.arrows.setMatrixAt(n++, m)
      }
    }
    this.arrows.count = n
    this.arrows.instanceMatrix.needsUpdate = true
  }

  private updateGhost(): void {
    const defId = this.input.selectedDefId
    if (!defId || !this.hasHover || !this.ghostHex || !this.game.grid.inBounds(this.ghostHex)) {
      if (this.ghost) this.ghost.visible = false
      return
    }
    if (this.ghostDefId !== defId) {
      if (this.ghost) this.scene.remove(this.ghost)
      const def = STRUCTURE_DEFS[defId]
      const g = new THREE.Group()
      const mesh = this.makeStructureMesh(def.tiers[0].kind)
      mesh.traverse(o => {
        const mm = o as THREE.Mesh
        if (mm.isMesh) {
          const src = mm.material as THREE.MeshStandardMaterial
          mm.material = new THREE.MeshStandardMaterial({
            color: src.color.getHex(),
            emissive: src.emissive.getHex(),
            emissiveIntensity: src.emissiveIntensity,
            transparent: true,
            opacity: 0.5
          })
        }
      })
      const r = def.tiers[0].radius
      const ringGeo = new THREE.RingGeometry(Math.max(r - 0.08, 0.1), r, 56)
      ringGeo.rotateX(-Math.PI / 2)
      this.ghostRingMat = new THREE.MeshBasicMaterial({
        color: VALID_COLOR,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        depthWrite: false
      })
      const ring = new THREE.Mesh(ringGeo, this.ghostRingMat)
      ring.position.y = 0.07
      const discGeo = new THREE.CircleGeometry(0.9, 24)
      discGeo.rotateX(-Math.PI / 2)
      this.ghostDiscMat = new THREE.MeshBasicMaterial({
        color: VALID_COLOR,
        transparent: true,
        opacity: 0.35,
        depthWrite: false
      })
      const disc = new THREE.Mesh(discGeo, this.ghostDiscMat)
      disc.position.y = 0.05
      g.add(mesh, ring, disc)
      this.ghost = g
      this.ghostDefId = defId
      this.scene.add(g)
    }
    const valid = this.game.canPlace(defId, this.ghostHex).ok
    const world = hexToWorld(this.ghostHex)
    const ghost = this.ghost
    if (!ghost) return
    ghost.visible = true
    ghost.position.set(world.x, 0, world.z)
    if (valid !== this.ghostValid) {
      const color = valid ? VALID_COLOR : INVALID_COLOR
      this.ghostRingMat?.color.setHex(color)
      this.ghostDiscMat?.color.setHex(color)
      this.ghostValid = valid
    }
  }

  private spawnLightning(p: LightningPayload): void {
    const slot = this.lightningPool[this.poolIndex++ % this.lightningPool.length]
    slot.line.geometry.setFromPoints(p.points.map(pt => new THREE.Vector3(pt.x, 0.7, pt.z)))
    slot.life = 0.14
  }

  private spawnFlash(from: WorldPos, to: WorldPos): void {
    for (const pos of [from, to]) {
      const slot = this.flashPool[this.poolIndex++ % this.flashPool.length]
      slot.ring.position.set(pos.x, 0.2, pos.z)
      slot.ring.visible = true
      slot.ring.scale.setScalar(0.4)
      ;(slot.ring.material as THREE.MeshBasicMaterial).opacity = 0.9
      slot.life = 0.45
    }
  }

  private pickHex(clientX: number, clientY: number): HexCoord | null {
    const rect = this.canvas.getBoundingClientRect()
    this.hoverNdc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
    this.raycaster.setFromCamera(this.hoverNdc, this.camera)
    const hit = new THREE.Vector3()
    if (!this.raycaster.ray.intersectPlane(this.plane, hit)) return null
    return worldToHex(hit.x, hit.z)
  }

  private worldPerPixel(): number {
    const fovRad = (this.camera.fov * Math.PI) / 180
    return (2 * this.dist * Math.tan(fovRad / 2)) / this.canvas.clientHeight
  }

  private clampTarget(): void {
    const grid = this.game.grid
    const minX = hexToWorld({ col: 0, row: 0 }).x - 3
    const maxX = hexToWorld({ col: grid.cols - 1, row: grid.rows - 1 }).x + 3
    this.target.x = THREE.MathUtils.clamp(this.target.x, minX, maxX)
    this.target.z = THREE.MathUtils.clamp(this.target.z, -3, 1.5 * (grid.rows - 1) + 3)
  }

  private bindInput(): void {
    const canvas = this.canvas
    canvas.addEventListener('pointerdown', e => {
      this.dragging = true
      this.panning = false
      this.lastX = e.clientX
      this.lastY = e.clientY
      canvas.setPointerCapture(e.pointerId)
    })
    canvas.addEventListener('pointermove', e => {
      if (this.dragging) {
        const dx = e.clientX - this.lastX
        const dy = e.clientY - this.lastY
        if (!this.panning && Math.abs(dx) + Math.abs(dy) > 7) this.panning = true
        if (this.panning) {
          const wpp = this.worldPerPixel()
          this.target.x -= dx * wpp
          this.target.z -= dy * wpp
          this.clampTarget()
        }
        this.lastX = e.clientX
        this.lastY = e.clientY
      } else {
        this.ghostHex = this.pickHex(e.clientX, e.clientY)
        this.hasHover = true
        this.updateGhost()
      }
    })
    canvas.addEventListener('pointerup', e => {
      if (this.dragging && !this.panning) {
        const hex = this.pickHex(e.clientX, e.clientY)
        if (hex && this.onTap) this.onTap(hex)
      }
      this.dragging = false
      this.panning = false
    })
    canvas.addEventListener('pointerleave', () => {
      this.hasHover = false
      if (this.ghost) this.ghost.visible = false
    })
    canvas.addEventListener(
      'wheel',
      e => {
        e.preventDefault()
        this.dist = THREE.MathUtils.clamp(this.dist * (1 + e.deltaY * 0.0009), 13, 36)
      },
      { passive: false }
    )
    window.addEventListener('keydown', e => {
      if (e.code === 'KeyW' || e.code === 'KeyA' || e.code === 'KeyS' || e.code === 'KeyD') {
        this.keys.add(e.code)
      }
    })
    window.addEventListener('keyup', e => this.keys.delete(e.code))
  }

  private resize(): void {
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    this.webgl.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  refreshSelection(): void {
    this.ghostDefId = null
    this.updateGhost()
  }

  projectPoint(p: WorldPos): ScreenPoint {
    const v = new THREE.Vector3(p.x, 1.4, p.z).project(this.camera)
    return {
      x: (v.x * 0.5 + 0.5) * this.canvas.clientWidth,
      y: (-v.y * 0.5 + 0.5) * this.canvas.clientHeight,
      visible: v.z < 1 && v.x > -1.1 && v.x < 1.1 && v.y > -1.1 && v.y < 1.1
    }
  }

  update(dt: number): void {
    this.time += dt

    const panSpeed = 15 * (this.dist / 22) * dt
    let mx = 0
    let mz = 0
    if (this.keys.has('KeyW')) mz -= 1
    if (this.keys.has('KeyS')) mz += 1
    if (this.keys.has('KeyA')) mx -= 1
    if (this.keys.has('KeyD')) mx += 1
    if (mx !== 0 || mz !== 0) {
      this.target.x += mx * panSpeed
      this.target.z += mz * panSpeed
      this.clampTarget()
    }

    this.camera.position.set(this.target.x, this.dist * 0.92, this.target.z + this.dist * 0.72)
    this.camera.lookAt(this.target)

    const enemies = this.game.enemies
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const scaleVec = new THREE.Vector3()
    const pos = new THREE.Vector3()
    const color = new THREE.Color()
    const poisonTint = new THREE.Color(POISON_COLOR)
    for (let i = 0; i < enemies.length && i < 300; i++) {
      const e = enemies[i]
      const w = lerpHexToWorld(e.cur, e.next, e.t)
      const s = e.def.scale
      scaleVec.setScalar(s)
      pos.set(w.x, 0.52 * s, w.z)
      q.identity()
      m.compose(pos, q, scaleVec)
      this.enemyMesh.setMatrixAt(i, m)
      color.setHex(e.def.color)
      if (e.poisonStacks > 0) {
        color.lerp(poisonTint, Math.min(e.poisonStacks / 5, 1) * 0.55)
      }
      this.enemyMesh.setColorAt(i, color)
    }
    this.enemyMesh.count = Math.min(enemies.length, 300)
    this.enemyMesh.instanceMatrix.needsUpdate = true
    if (this.enemyMesh.instanceColor) this.enemyMesh.instanceColor.needsUpdate = true

    let rn = 0
    for (let i = 0; i < enemies.length && rn < 300; i++) {
      const e = enemies[i]
      if (!e.def.traitName || !e.revealed) continue
      const w = lerpHexToWorld(e.cur, e.next, e.t)
      m.compose(new THREE.Vector3(w.x, 0.1, w.z), q.identity(), scaleVec.set(1, 1, 1))
      this.revealMesh.setMatrixAt(rn++, m)
    }
    this.revealMesh.count = rn
    this.revealMesh.instanceMatrix.needsUpdate = true

    const allies = this.game.allies
    for (let i = 0; i < allies.length && i < 40; i++) {
      const a = allies[i]
      const w = hexToWorld(a.hex)
      pos.set(w.x, 0.34 + Math.sin(this.time * 3 + a.id) * 0.06, w.z)
      scaleVec.setScalar(1)
      m.compose(pos, q.identity(), scaleVec)
      this.allyMesh.setMatrixAt(i, m)
    }
    this.allyMesh.count = Math.min(allies.length, 40)
    this.allyMesh.instanceMatrix.needsUpdate = true

    for (const s of this.game.structures) {
      const key = `${s.hex.col},${s.hex.row}`
      const bar = this.hpBars.get(key)
      if (!bar) continue
      const pct = Math.max(s.hp / s.maxHp, 0)
      const damaged = s.hp < s.maxHp
      bar.bg.visible = damaged
      bar.fill.visible = damaged
      bar.bg.position.set(hexToWorld(s.hex).x, 1.85, hexToWorld(s.hex).z)
      bar.fill.scale.x = Math.max(pct, 0.001)
      bar.fill.position.x = hexToWorld(s.hex).x - (1 - pct) * 0.52
      bar.fill.position.z = hexToWorld(s.hex).z + 0.001
      const mat = bar.fill.material as THREE.MeshBasicMaterial
      mat.color.setHex(pct > 0.5 ? 0x7fe3a0 : pct > 0.25 ? 0xe8c860 : 0xff5a5a)
    }

    if (this.selected) {
      const world = hexToWorld(this.selected.hex)
      this.selectRing.position.set(world.x, 0.16, world.z)
      this.selectRing.rotation.z += dt * 0.8
    }

    const pulse = 0.6 + (this.game.progress / 100) * 1.6
    this.ritualRing.emissiveIntensity = pulse
    this.ritualOrb.position.y = 1.2 + Math.sin(this.time * 2.2) * 0.12
    this.ritualOrb.rotation.y += dt * 1.5
    this.ritualOrb.scale.setScalar(1 + (this.game.progress / 100) * 0.6)

    if (this.ghostRingMat) {
      this.ghostRingMat.opacity = 0.32 + 0.12 * Math.sin(this.time * 6)
    }

    for (const slot of this.lightningPool) {
      if (slot.life > 0) {
        slot.life -= dt
        ;(slot.line.material as THREE.LineBasicMaterial).opacity = Math.max(slot.life / 0.14, 0) * 0.9
      }
    }

    for (const slot of this.flashPool) {
      if (slot.life > 0) {
        slot.life -= dt
        const t = 1 - Math.max(slot.life / 0.45, 0)
        slot.ring.scale.setScalar(0.4 + t * 1.4)
        ;(slot.ring.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.9
        if (slot.life <= 0) slot.ring.visible = false
      }
    }
  }

  render(): void {
    this.webgl.render(this.scene, this.camera)
  }
}
