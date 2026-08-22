export type Listener<T = unknown> = (payload: T) => void

export class Emitter {
  private listeners = new Map<string, Listener[]>()

  on<T>(name: string, fn: Listener<T>): () => void {
    const list = this.listeners.get(name) ?? []
    list.push(fn as Listener)
    this.listeners.set(name, list)
    return () => {
      const arr = this.listeners.get(name)
      if (!arr) return
      const i = arr.indexOf(fn as Listener)
      if (i >= 0) arr.splice(i, 1)
    }
  }

  emit<T>(name: string, payload?: T): void {
    const arr = this.listeners.get(name)
    if (!arr) return
    for (const fn of [...arr]) {
      ;(fn as Listener<T | undefined>)(payload)
    }
  }
}
