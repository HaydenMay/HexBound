import * as THREE from 'three'
import { Game, type LightningPayload, type NovaPayload } from '../sim/game'
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
  private charmMesh!: THREE.InstancedMesh
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
  private flashPool: { ring: THREE.Mesh; life: number; maxLife: number }[] = []
  private poolIndex = 0
  private time = 0

  private panning = false
  private lastX = 0
  private lastY = 0
  private hoverNdc = new THREE.Vector2()
  private hasHover = false
  private activePointers = new Map<number, { x: number; y: number }>()
  private pinchDist = 0

  constructor(private canvas: HTMLCanvasElement, private game: Game, private input: { selectedDefId: string | null }) {
    this.webgl = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.webgl.setSize(canvas.clientWidth, canvas.clientHeight, false)
    this.webgl.toneMapping = THREE.ACESFilmicToneMapping
    this.webgl.toneMappingExposure = 1.15

    this.scene.background = new THREE.Color(0x0d0a16)
    this.scene.fog = new THREE.Fog(0x181128, 28, 80)

    const ritualWorld = hexToWorld(game.grid.ritual)
    this.target = new THREE.Vector3(ritualWorld.x, 0, ritualWorld.z - game.grid.rows * 0.18)
    const aspect = Math.max(canvas.clientWidth / Math.max(canvas.clientHeight, 1), 0.4)
    const aspectFix = THREE.MathUtils.clamp(1.55 / aspect, 1, 2.5)
    this.dist = THREE.MathUtils.clamp(game.grid.rows * 1.45 * aspectFix, 12, 34)
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200)

    const hemi = new THREE.HemisphereLight(0x9a8ac8, 0x14101f, 1.0)
    const dir = new THREE.DirectionalLight(0xfff2e0, 1.4)
    dir.position.set(12, 22, 8)
    const moonFill = new THREE.DirectionalLight(0x7a8aff, 0.5)
    moonFill.position.set(-14, 18, -10)
    this.scene.add(hemi, dir, moonFill)

    const ground = new THREE.Mesh(new THREE.CircleGeometry(80, 48), new THREE.MeshBasicMaterial({ color: 0x120e1c }))
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.35
    this.scene.add(ground)

    const hexGeo = new THREE.CylinderGeometry(HEX_SIZE * 0.94, HEX_SIZE * 0.94, 0.24, 6)
    hexGeo.rotateY(Math.PI / 6)
    this.tiles = new THREE.InstancedMesh(hexGeo, new THREE.MeshStandardMaterial({ color: 0xffffff }), game.grid.cols * game.grid.rows)
    this.tiles.position.y = -0.12
    this.scene.add(this.tiles)

    const arrowGeo = new THREE.ConeGeometry(0.11, 0.3, 4)
    arrowGeo.rotateX(Math.PI / 2)
    this.arrows = new THREE.InstancedMesh(
      arrowGeo,
      new THREE.MeshBasicMaterial({ color: 0x6fd8c8, transparent: true, opacity: 0.22, depthWrite: false }),
      game.grid.cols * game.grid.rows
    )
    this.scene.add(this.arrows)

    this.enemyMesh = new THREE.InstancedMesh(
      new THREE.CapsuleGeometry(0.3, 0.42, 3, 10),
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
      300
    )
    this.enemyMesh.count = 0
    this.enemyMesh.frustumCulled = false
    this.scene.add(this.enemyMesh)

    this.allyMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.2, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x1f3a2c, emissive: 0x76e8b0, emissiveIntensity: 1.6 }),
      40
    )
    this.allyMesh.count = 0
    this.allyMesh.frustumCulled = false
    this.scene.add(this.allyMesh)

    const charmGeo = new THREE.RingGeometry(0.34, 0.46, 20)
    charmGeo.rotateX(-Math.PI / 2)
    this.charmMesh = new THREE.InstancedMesh(
      charmGeo,
      new THREE.MeshBasicMaterial({ color: 0xc08aff, transparent: true, opacity: 0.9, depthWrite: false }),
      300
    )
    this.charmMesh.count = 0
    this.charmMesh.frustumCulled = false
    this.scene.add(this.charmMesh)

    this.buildSky()
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
      this.flashPool.push({ ring, life: 0, maxLife: 0.45 })
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
    game.events.on<NovaPayload>('nova', p => this.spawnNova(p))

    this.bindInput()
    window.addEventListener('resize', () => this.resize())
    this.resize()
  }

  private buildSky(): void {
    const grid = this.game.grid
    const minX = hexToWorld({ col: 0, row: grid.rows - 1 }).x - 10
    const maxX = hexToWorld({ col: grid.cols - 1, row: 0 }).x + 10
    const backZ = hexToWorld({ col: 0, row: 0 }).z - 2
    const spireMat = new THREE.MeshBasicMaterial({ color: 0x130d20 })
    for (let i = 0; i < 46; i++) {
      const h = 5 + Math.random() * 9
      const spire = new THREE.Mesh(new THREE.ConeGeometry(1.4 + Math.random() * 2.2, h, 5), spireMat)
      spire.position.set(minX + Math.random() * (maxX - minX), h / 2 - 0.6, backZ + Math.random() * 4 - 3)
      this.scene.add(spire)
    }
    for (let i = 0; i < 5; i++) {
      const h = 13 + Math.random() * 6
      const giant = new THREE.Mesh(new THREE.ConeGeometry(3, h, 5), spireMat)
      giant.position.set(minX + ((i + 0.5) / 5) * (maxX - minX) + (Math.random() - 0.5) * 6, h / 2 - 0.6, backZ - 2 - Math.random() * 2)
      this.scene.add(giant)
    }
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
    const addTick = (fn: (t: number, dt: number) => void) => {
      const prev = g.userData.tick as ((t: number, dt: number) => void) | undefined
      g.userData.tick = prev ? (t: number, dt: number) => { prev(t, dt); fn(t, dt) } : fn
    }
    const resident = (): THREE.Group => {
      const fig = new THREE.Group()
      const robe = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 6), std(0x3a2a5a))
      robe.position.y = 0.2
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), std(0xd8b8a0))
      head.position.y = 0.46
      const hat = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.24, 6), std(0x241a3a))
      hat.position.y = 0.62
      fig.add(robe, head, hat)
      return fig
    }
    if (kind === 'cauldron') {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.4, 0.55, 10), std(0x3b2f52))
      pot.position.y = 0.28
      const brewMat = std(0x2f4a35, 0x8cff9d, 1.4)
      const brew = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.1, 10), brewMat)
      brew.position.y = 0.58
      g.add(pot, brew)
      const witch = resident()
      witch.position.set(0.62, 0, 0.22)
      witch.rotation.y = -Math.PI / 2.4
      const stickPivot = new THREE.Group()
      stickPivot.position.set(-0.12, 0.34, -0.14)
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 5), std(0x5a4632))
      stick.rotation.x = Math.PI / 2.6
      stick.position.z = 0.16
      stickPivot.add(stick)
      witch.add(stickPivot)
      g.add(witch)
      let active = false
      g.userData.setActive = (v: boolean) => {
        active = v
      }
      addTick((t, dt) => {
        witch.position.y = Math.sin(t * 2.1) * 0.02
        stickPivot.rotation.y += (active ? 7 : 1.6) * dt
        const targetI = active ? 2.6 : 1.4
        brewMat.emissiveIntensity += (targetI - brewMat.emissiveIntensity) * 0.08
        const pulse = active ? 1 + Math.sin(t * 9) * 0.06 : 1
        brew.scale.setScalar(pulse)
      })
    } else if (kind === 'totem') {
      const pole = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.5, 6), std(0x4a3a63))
      pole.position.y = 0.75
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), std(0x2a3a55, 0x9fd8ff, 1.8))
      orb.position.y = 1.58
      g.add(pole, orb)
      const shaman = resident()
      shaman.scale.setScalar(0.85)
      shaman.position.set(-0.6, 0, 0.18)
      shaman.rotation.y = Math.PI / 2
      const armGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.3, 5)
      const armL = new THREE.Mesh(armGeo, std(0x3a2a5a))
      armL.rotation.z = -2.2
      armL.position.set(-0.12, 0.42, 0)
      const armR = new THREE.Mesh(armGeo, std(0x3a2a5a))
      armR.rotation.z = 2.2
      armR.position.set(0.12, 0.42, 0)
      shaman.add(armL, armR)
      g.add(shaman)
      addTick(t => {
        shaman.position.y = Math.abs(Math.sin(t * 3.4)) * 0.07
        shaman.rotation.z = Math.sin(t * 3.4) * 0.08
      })    } else if (kind === 'idol') {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 0.24, 8), std(0x3a2f52))
      base.position.y = 0.12
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.72, 6), std(0x3a2f52))
      body.position.y = 0.6
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), std(0x2a1a3e, 0xc08aff, 2.4))
      head.position.y = 1.02
      g.add(base, body, head)
      const whisperer = resident()
      whisperer.scale.setScalar(0.7)
      g.add(whisperer)
      addTick(t => {
        const a = t * 0.5
        whisperer.position.set(Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62)
        whisperer.rotation.y = -a - Math.PI / 2
        whisperer.rotation.x = Math.max(Math.sin(t * 2.4), 0) * 0.5
      })
    } else if (kind === 'well') {
      const rimGeo = new THREE.TorusGeometry(0.55, 0.09, 8, 28)
      rimGeo.rotateX(-Math.PI / 2)
      const rim = new THREE.Mesh(rimGeo, std(0x3a2f52, 0x8ad8ff, 1.2))
      rim.position.y = 0.18
      const water = new THREE.Mesh(
        new THREE.CircleGeometry(0.5, 24),
        new THREE.MeshBasicMaterial({ color: 0x1a3a55 })
      )
      water.rotation.x = -Math.PI / 2
      water.position.y = 0.12
      const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.5, 6), std(0x3a2f52))
      post1.position.set(-0.42, 0.25, -0.3)
      const post2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.5, 6), std(0x3a2f52))
      post2.position.set(0.42, 0.25, -0.3)
      g.add(rim, water, post1, post2)
      const keeper = resident()
      keeper.position.set(0.6, 0, 0.28)
      keeper.rotation.y = -Math.PI / 2.4
      const ladlePivot = new THREE.Group()
      ladlePivot.position.set(-0.12, 0.36, -0.14)
      const ladle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.46, 5), std(0x9a8a6a))
      ladle.rotation.x = Math.PI / 2.4
      ladle.position.z = 0.13
      ladlePivot.add(ladle)
      keeper.add(ladlePivot)
      g.add(keeper)
      const rimMat = rim.material as THREE.MeshStandardMaterial
      addTick(t => {
        ladlePivot.rotation.x = Math.sin(t * 1.7) * 0.4
        keeper.position.y = Math.abs(Math.sin(t * 3.4)) * 0.02
        rimMat.emissiveIntensity = 1.1 + Math.sin(t * 2.2) * 0.45
        water.position.y = 0.12 + Math.sin(t * 2.6) * 0.008
      })
    } else if (kind === 'mirror') {
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.2, 8), std(0x3a2f52))
      stand.position.y = 0.1
      const frame = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 8, 28), std(0x2a2a3e, 0xf0f0ff, 1.3))
      frame.position.y = 0.85
      const glass = new THREE.Mesh(
        new THREE.CircleGeometry(0.44, 24),
        new THREE.MeshBasicMaterial({ color: 0xcfd8ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
      )
      glass.position.y = 0.85
      g.add(stand, frame, glass)
      const attendant = resident()
      attendant.scale.setScalar(0.72)
      attendant.position.set(0.58, 0, 0.32)
      attendant.rotation.y = -Math.PI / 2.2
      const clothPivot = new THREE.Group()
      clothPivot.position.set(-0.1, 0.38, -0.12)
      const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.09), std(0xd8cfe8, 0xf0f0ff, 0.4))
      cloth.position.z = 0.1
      clothPivot.add(cloth)
      attendant.add(clothPivot)
      g.add(attendant)
      const glassMat = glass.material as THREE.MeshBasicMaterial
      addTick(t => {
        clothPivot.rotation.y = Math.sin(t * 3.1) * 0.7
        glassMat.opacity = 0.48 + Math.sin(t * 2.3) * 0.12
      })
    } else if (kind === 'ring') {
      const caps: THREE.Mesh[] = []
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2
        const mx = Math.cos(angle) * 0.55
        const mz = Math.sin(angle) * 0.55
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.2, 6), std(0xd8d0c0))
        stem.position.set(mx, 0.1, mz)
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), std(0x2a4a38, 0x9dffce, 1.5))
        cap.scale.y = 0.7
        cap.position.set(mx, 0.24, mz)
        caps.push(cap)
        g.add(stem, cap)
      }
      const hermit = resident()
      hermit.scale.setScalar(0.75)
      hermit.position.y = -0.06
      hermit.rotation.y = Math.PI / 3
      g.add(hermit)
      addTick(t => {
        for (let i = 0; i < caps.length; i++) {
          caps[i].position.y = 0.24 + Math.sin(t * 2 + i * 1.3) * 0.02
          caps[i].scale.y = 0.7 + Math.sin(t * 3 + i) * 0.05
        }
        hermit.rotation.z = Math.sin(t * 1.2) * 0.06
      })
    } else if (kind === 'wall') {
      const boneMat = std(0xe8e2d0)
      for (let i = 0; i < 4; i++) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.66, 5), boneMat)
        post.position.set(-0.42 + i * 0.28, 0.33, i % 2 === 0 ? 0.06 : -0.06)
        post.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.06
        g.add(post)
      }
      const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.98, 5), boneMat)
      crossbar.rotation.z = Math.PI / 2
      crossbar.position.y = 0.46
      const crossbar2 = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.98, 5), boneMat)
      crossbar2.rotation.z = Math.PI / 2
      crossbar2.position.y = 0.22
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), std(0xf4efe0))
      skull.position.set(0, 0.6, 0)
      skull.scale.y = 0.85
      g.add(crossbar, crossbar2, skull)
    } else {
      const t1 = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.95, 6), std(0x2f6b45))
      t1.position.set(-0.28, 0.47, 0.12)
      const t2 = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.72, 6), std(0x3f8f55))
      t2.position.set(0.3, 0.36, -0.18)
      const t3 = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 6), std(0x2a5a3c))
      t3.position.set(0.05, 0.28, 0.32)
      g.add(t1, t2, t3)
      const keeper = resident()
      keeper.scale.setScalar(0.78)
      keeper.position.set(0.42, 0, 0.3)
      keeper.rotation.y = Math.PI / 2.2
      g.add(keeper)
      addTick(t => {
        t1.rotation.z = Math.sin(t * 1.1 + 1) * 0.04
        t2.rotation.z = Math.sin(t * 0.9 + 2.4) * 0.04
        t3.rotation.z = Math.sin(t * 1.4) * 0.04
        keeper.rotation.z = Math.sin(t * 1.6) * 0.05
      })
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
    ;(slot.line.material as THREE.LineBasicMaterial).color.setHex(p.color)
    slot.life = 0.14
  }

  private spawnNova(p: NovaPayload): void {
    const slot = this.flashPool[this.poolIndex++ % this.flashPool.length]
    slot.ring.position.set(p.pos.x, 0.25, p.pos.z)
    slot.ring.visible = true
    slot.ring.scale.setScalar(0.4)
    const mat = slot.ring.material as THREE.MeshBasicMaterial
    mat.color.setHex(p.color)
    mat.opacity = 0.95
    slot.life = 1
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

  private currentPinchDistance(): number {
    const pts = [...this.activePointers.values()]
    if (pts.length < 2) return 0
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
  }

  private bindInput(): void {
    const canvas = this.canvas
    canvas.addEventListener('pointerdown', e => {
      canvas.setPointerCapture(e.pointerId)
      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (this.activePointers.size === 1) {
        this.panning = false
        this.lastX = e.clientX
        this.lastY = e.clientY
      } else if (this.activePointers.size === 2) {
        this.panning = true
        this.pinchDist = this.currentPinchDistance()
      } else {
        this.panning = true
      }
    })
    canvas.addEventListener('pointermove', e => {
      const tracked = this.activePointers.get(e.pointerId)
      if (tracked) {
        tracked.x = e.clientX
        tracked.y = e.clientY
        if (this.activePointers.size >= 2) {
          const nd = this.currentPinchDistance()
          if (nd > 10 && this.pinchDist > 0) {
          this.dist = THREE.MathUtils.clamp(this.dist * (this.pinchDist / nd), 9, 36)
            this.pinchDist = nd
          }
          return
        }
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
      } else if (this.activePointers.size === 0) {
        this.ghostHex = this.pickHex(e.clientX, e.clientY)
        this.hasHover = true
        this.updateGhost()
      }
    })
    const releasePointer = (e: PointerEvent, allowTap: boolean) => {
      this.activePointers.delete(e.pointerId)
      if (this.activePointers.size < 2) this.pinchDist = 0
      if (allowTap && !this.panning && this.activePointers.size === 0) {
        const hex = this.pickHex(e.clientX, e.clientY)
        if (hex && this.onTap) this.onTap(hex)
      }
      if (this.activePointers.size === 0) {
        this.panning = false
      }
    }
    canvas.addEventListener('pointerup', e => releasePointer(e, true))
    canvas.addEventListener('pointercancel', e => releasePointer(e, false))
    canvas.addEventListener('pointerleave', () => {
      this.hasHover = false
      if (this.ghost) this.ghost.visible = false
    })
    canvas.addEventListener(
      'wheel',
      e => {
        e.preventDefault()
        this.dist = THREE.MathUtils.clamp(this.dist * (1 + e.deltaY * 0.0009), 9, 36)
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

  projectHexToScreen(col: number, row: number): ScreenPoint {
    return this.projectPoint(hexToWorld({ col, row }))
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

    let cn = 0
    for (let i = 0; i < enemies.length && cn < 300; i++) {
      const e = enemies[i]
      if (!e.charmedBy) continue
      const w = lerpHexToWorld(e.cur, e.next, e.t)
      m.compose(new THREE.Vector3(w.x, 0.1, w.z), q.identity(), scaleVec.set(1, 1, 1))
      this.charmMesh.setMatrixAt(cn++, m)
    }
    this.charmMesh.count = cn
    this.charmMesh.instanceMatrix.needsUpdate = true

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
      const world = hexToWorld(s.hex)
      const group = this.structureGroups.get(key)
      if (group) {
        const tick = group.userData.tick as ((t: number, dt: number) => void) | undefined
        if (tick) tick(this.time, dt)
        const setActive = group.userData.setActive as ((v: boolean) => void) | undefined
        if (setActive) {
          const r = currentTier(s).radius + 0.4
          let active = false
          for (const e of enemies) {
            const p = lerpHexToWorld(e.cur, e.next, e.t)
            const dx = p.x - world.x
            const dz = p.z - world.z
            if (dx * dx + dz * dz <= r * r) {
              active = true
              break
            }
          }
          setActive(active)
        }
      }
      const bar = this.hpBars.get(key)
      if (!bar) continue
      const pct = Math.max(s.hp / s.maxHp, 0)
      const damaged = s.hp < s.maxHp
      bar.bg.visible = damaged
      bar.fill.visible = damaged
      bar.bg.position.set(world.x, 1.85, world.z)
      bar.fill.scale.x = Math.max(pct, 0.001)
      bar.fill.position.x = world.x - (1 - pct) * 0.52
      bar.fill.position.z = world.z + 0.001
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
        const t = 1 - Math.max(slot.life / slot.maxLife, 0)
        slot.ring.scale.setScalar(0.4 + t * 1.8)
        ;(slot.ring.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.9
        if (slot.life <= 0) slot.ring.visible = false
      }
    }
  }

  render(): void {
    this.webgl.render(this.scene, this.camera)
  }
}
