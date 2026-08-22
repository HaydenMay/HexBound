export interface HexboundSave {
  version: 1
  unlockedLevels: number
}

const KEY = 'hexbound.save.v1'

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

let memoryFallback: StorageLike | null = null

function storage(): StorageLike {
  if (memoryFallback) return memoryFallback
  try {
    const g = globalThis as { localStorage?: StorageLike }
    if (g.localStorage) return g.localStorage
  } catch (err) {
    console.warn('localStorage unavailable, using in-memory save', err)
  }
  memoryFallback = {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined
  }
  return memoryFallback
}

export function loadSave(store?: StorageLike): HexboundSave {
  try {
    const raw = (store ?? storage()).getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as HexboundSave
      if (parsed.version === 1 && typeof parsed.unlockedLevels === 'number' && parsed.unlockedLevels >= 1) {
        return parsed
      }
    }
  } catch (err) {
    console.warn('corrupt save, starting fresh', err)
  }
  return { version: 1, unlockedLevels: 1 }
}

export function saveProgress(unlockedLevels: number, store?: StorageLike): void {
  try {
    ;(store ?? storage()).setItem(KEY, JSON.stringify({ version: 1, unlockedLevels } satisfies HexboundSave))
  } catch (err) {
    console.warn('failed to persist progress', err)
  }
}

export function resetSave(store?: StorageLike): void {
  try {
    ;(store ?? storage()).removeItem(KEY)
  } catch (err) {
    console.warn('failed to reset save', err)
  }
}

export type { StorageLike }
