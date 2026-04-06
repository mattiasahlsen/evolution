export class Mulberry32 {
  private _state: number

  constructor(seed: number) {
    this._state = seed | 0
  }

  next(): number {
    let t = (this._state += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  get state(): number {
    return this._state
  }

  static fromState(state: number): Mulberry32 {
    const rng = new Mulberry32(0)
    rng._state = state
    return rng
  }
}
