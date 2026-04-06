import type { ReplicatorStats } from './types';
import type { ReplicatorSnapshot } from './snapshot';

let nextId = 0;

export function getNextId(): number {
  return nextId;
}

export function setNextId(id: number): void {
  nextId = id;
}

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
    heading: number = 0,
  ) {
    this.id = nextId++;
    this.x = x;
    this.y = y;
    this.heading = heading;
    this.stats = { ...stats };
    this.hue = hue;
    this.saturation = saturation;
    this.lightness = lightness;
  }

  get color(): string {
    return `hsl(${this.hue}, ${this.saturation}%, ${this.lightness}%)`;
  }

  toSnapshot(): ReplicatorSnapshot {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      heading: this.heading,
      stats: { ...this.stats },
      hue: this.hue,
      saturation: this.saturation,
      lightness: this.lightness,
    };
  }

  static fromSnapshot(snap: ReplicatorSnapshot): Replicator {
    const r = Object.create(Replicator.prototype) as Replicator;
    (r as { id: number }).id = snap.id;
    r.x = snap.x;
    r.y = snap.y;
    r.heading = snap.heading;
    r.stats = { ...snap.stats };
    r.hue = snap.hue;
    r.saturation = snap.saturation;
    r.lightness = snap.lightness;
    return r;
  }
}
