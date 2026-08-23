// Local gate for the Godot web export: serves dist-godot/ under /HexBound/,
// asserts the wasm+pck are fetched with zero page errors, and dumps a boot
// screenshot. Usage: node wasm-smoke.mjs [dir]
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { createRequire } from 'node:module'

// playwright lives in the archived TS stack's node_modules
const { chromium } = createRequire(new URL('./legacy-ts/package.json', import.meta.url))('playwright')

const root = process.argv[2] ?? 'dist-godot'
const port = 8123
const types = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.pck': 'application/octet-stream', '.png': 'image/png' }
const fetched = new Set()

const server = http.createServer(async (req, res) => {
  const path = req.url === '/HexBound/' || req.url === '/HexBound' ? '/index.html' : req.url.replace(/^\/HexBound\/?/, '/')
  fetched.add(path)
  try {
    const data = await readFile(join(root, path))
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' })
    res.end(data)
  } catch {
    res.writeHead(404)
    res.end('nope')
  }
})

await new Promise(r => server.listen(port, r))
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const errors = []
page.on('pageerror', e => errors.push(String(e)))
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
await page.goto(`http://localhost:${port}/HexBound/`)
await page.waitForTimeout(14000)
await page.screenshot({ path: 'screenshots/wasm-boot.png' })
const booted = fetched.has('/index.pck') && fetched.has('/index.wasm') && errors.length === 0
console.log(JSON.stringify({ booted, pck: fetched.has('/index.pck'), wasm: fetched.has('/index.wasm'), errors: errors.slice(0, 5) }))
await browser.close()
server.close()
process.exit(booted ? 0 : 1)
