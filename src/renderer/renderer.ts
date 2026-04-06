import type { Organism } from '../organism/organism'
import { statsToColor } from '../organism/stats'
import { getSpriteForColor, SPRITE_SIZE } from '../sprite'

export class Renderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
  }

  resize(width: number, height: number): void {
    this.canvas.width = width
    this.canvas.height = height
  }

  render(replicators: Organism[]): void {
    const { ctx } = this
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Dark background
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    const half = SPRITE_SIZE / 2
    for (const r of replicators) {
      const sprite = getSpriteForColor(statsToColor(r.getStats()))
      const pos = r.getPosition()
      ctx.drawImage(
        sprite,
        pos.x - half,
        pos.y - half,
        SPRITE_SIZE,
        SPRITE_SIZE,
      )
    }
  }

  findOrganismAt(x: number, y: number, organisms: Organism[]): Organism | null {
    const half = SPRITE_SIZE / 2
    // Search in reverse so topmost (last drawn) is found first
    for (let i = organisms.length - 1; i >= 0; i--) {
      const r = organisms[i]
      const pos = r.getPosition()
      if (
        x >= pos.x - half &&
        x <= pos.x + half &&
        y >= pos.y - half &&
        y <= pos.y + half
      ) {
        return r
      }
    }
    return null
  }
}
