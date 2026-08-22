export interface LabelItem {
  text: string
  x: number
  y: number
  visible: boolean
}

export class LabelLayer {
  private pool: HTMLDivElement[] = []

  constructor(private container: HTMLElement) {}

  update(items: LabelItem[]): void {
    for (let i = 0; i < items.length; i++) {
      let el = this.pool[i]
      if (!el) {
        el = document.createElement('div')
        el.className = 'trait-label'
        this.container.appendChild(el)
        this.pool.push(el)
      }
      const it = items[i]
      el.textContent = it.text
      el.style.transform = `translate(-50%, -130%) translate(${it.x}px, ${it.y}px)`
      el.style.display = it.visible ? 'block' : 'none'
    }
    for (let i = items.length; i < this.pool.length; i++) {
      this.pool[i].style.display = 'none'
    }
  }
}
