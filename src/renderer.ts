import type { Organism } from './organism';
import { statsToColor } from './organism';
import { getSpriteForColor, SPRITE_SIZE } from './sprite';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  render(replicators: Organism[]): void {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Dark background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const half = SPRITE_SIZE / 2;
    for (const r of replicators) {
      const sprite = getSpriteForColor(statsToColor(r.stats));
      ctx.drawImage(sprite, r.x - half, r.y - half, SPRITE_SIZE, SPRITE_SIZE);
    }
  }

  findReplicatorAt(
    x: number,
    y: number,
    replicators: Organism[],
  ): Organism | null {
    const half = SPRITE_SIZE / 2;
    // Search in reverse so topmost (last drawn) is found first
    for (let i = replicators.length - 1; i >= 0; i--) {
      const r = replicators[i];
      if (
        x >= r.x - half &&
        x <= r.x + half &&
        y >= r.y - half &&
        y <= r.y + half
      ) {
        return r;
      }
    }
    return null;
  }
}
