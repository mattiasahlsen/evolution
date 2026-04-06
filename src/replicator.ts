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

  constructor(
    x: number,
    y: number,
    stats: ReplicatorStats,
    heading: number = 0,
  ) {
    this.id = nextId++;
    this.x = x;
    this.y = y;
    this.heading = heading;
    this.stats = { ...stats };
  }

  get color(): string {
    const r = Math.round(Math.min(this.stats.replicationRate / 0.2, 1) * 255);
    const g = Math.round(Math.min(this.stats.deathRate / 0.2, 1) * 255);
    const b = Math.round(Math.min(this.stats.mutationRate / 0.2, 1) * 255);
    return `rgb(${r},${g},${b})`;
  }

  toSnapshot(): ReplicatorSnapshot {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      heading: this.heading,
      stats: { ...this.stats },
    };
  }

  static fromSnapshot(snap: ReplicatorSnapshot): Replicator {
    const r = Object.create(Replicator.prototype) as Replicator;
    (r as { id: number }).id = snap.id;
    r.x = snap.x;
    r.y = snap.y;
    r.heading = snap.heading;
    r.stats = { ...snap.stats };
    return r;
  }
}
