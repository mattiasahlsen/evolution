import type { ReplicatorStats } from './types';

let nextId = 0;

export class Replicator {
  readonly id: number;
  x: number;
  y: number;
  heading: number; // radians
  stats: ReplicatorStats;
  hue: number; // 0–360
  saturation: number;
  lightness: number;

  constructor(
    x: number,
    y: number,
    stats: ReplicatorStats,
    hue: number,
    saturation: number = 70,
    lightness: number = 50,
  ) {
    this.id = nextId++;
    this.x = x;
    this.y = y;
    this.heading = Math.random() * Math.PI * 2;
    this.stats = { ...stats };
    this.hue = hue;
    this.saturation = saturation;
    this.lightness = lightness;
  }

  get color(): string {
    return `hsl(${this.hue}, ${this.saturation}%, ${this.lightness}%)`;
  }
}
