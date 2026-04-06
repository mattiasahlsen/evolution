import type { SimConfig } from '../simulation/config'
import { statsToColor } from '../organism/stats'
import type { Organism } from '../organism/organism'

export interface UICallbacks {
  onPlay: () => void
  onPause: () => void
  onStep: () => void
  onReset: () => void
  onConfigChange: (config: Partial<SimConfig>) => void
  onScrub: (tick: number) => void
}

export class UI {
  private panel: HTMLElement
  private popCounter: HTMLElement
  private tickCounter: HTMLElement
  private tooltip: HTMLElement
  private callbacks: UICallbacks
  private configSliders: HTMLInputElement[] = []
  private scrubBar!: HTMLInputElement
  private scrubLabel!: HTMLElement
  private isScrubbing = false

  constructor(
    container: HTMLElement,
    config: SimConfig,
    callbacks: UICallbacks,
  ) {
    this.callbacks = callbacks

    this.panel = document.createElement('div')
    this.panel.className = 'controls-panel'

    this.popCounter = document.createElement('div')
    this.popCounter.className = 'stat-display'
    this.popCounter.textContent = 'Population: 0'

    this.tickCounter = document.createElement('div')
    this.tickCounter.className = 'stat-display'
    this.tickCounter.textContent = 'Tick: 0'

    this.tooltip = document.createElement('div')
    this.tooltip.className = 'tooltip'
    this.tooltip.style.display = 'none'
    document.body.appendChild(this.tooltip)

    this.buildPanel(config)
    container.appendChild(this.panel)
  }

  private buildPanel(config: SimConfig): void {
    this.panel.innerHTML = ''

    const title = document.createElement('h2')
    title.textContent = 'Evolution Sim'
    this.panel.appendChild(title)

    // Stats
    this.panel.appendChild(this.popCounter)
    this.panel.appendChild(this.tickCounter)

    // Playback
    const playbackDiv = document.createElement('div')
    playbackDiv.className = 'control-group'
    playbackDiv.innerHTML = '<label>Playback</label>'
    const btnRow = document.createElement('div')
    btnRow.className = 'btn-row'

    const playBtn = this.makeButton('Play', () => this.callbacks.onPlay())
    const pauseBtn = this.makeButton('Pause', () => this.callbacks.onPause())
    const stepBtn = this.makeButton('Step', () => this.callbacks.onStep())
    const resetBtn = this.makeButton('Reset', () => this.callbacks.onReset())

    btnRow.append(playBtn, pauseBtn, stepBtn, resetBtn)
    playbackDiv.appendChild(btnRow)
    this.panel.appendChild(playbackDiv)

    // Timeline scrub bar
    const scrubGroup = document.createElement('div')
    scrubGroup.className = 'control-group'

    const scrubLabelEl = document.createElement('label')
    scrubLabelEl.textContent = 'Timeline '
    this.scrubLabel = document.createElement('span')
    this.scrubLabel.className = 'slider-value'
    this.scrubLabel.textContent = '0'
    scrubLabelEl.appendChild(this.scrubLabel)

    this.scrubBar = document.createElement('input')
    this.scrubBar.type = 'range'
    this.scrubBar.min = '0'
    this.scrubBar.max = '0'
    this.scrubBar.step = '1'
    this.scrubBar.value = '0'

    this.scrubBar.addEventListener('input', () => {
      this.isScrubbing = true
      const tick = parseInt(this.scrubBar.value, 10)
      this.scrubLabel.textContent = String(tick)
      this.callbacks.onScrub(tick)
    })

    this.scrubBar.addEventListener('change', () => {
      this.isScrubbing = false
    })

    scrubGroup.appendChild(scrubLabelEl)
    scrubGroup.appendChild(this.scrubBar)
    this.panel.appendChild(scrubGroup)

    // Speed (playback control, not locked)
    this.addSlider('Speed', config.ticksPerFrame, 0.1, 10, 0.1, (v) => {
      this.callbacks.onConfigChange({ ticksPerFrame: v })
    })

    // Simulation params (locked on play)
    this.configSliders.push(
      this.addSlider('Spawn Rate', config.spawnRate, 0, 1, 0.01, (v) => {
        this.callbacks.onConfigChange({ spawnRate: v })
      }),
    )

    this.configSliders.push(
      this.addSlider(
        'Population Cap',
        config.populationCap,
        100,
        5000,
        100,
        (v) => {
          this.callbacks.onConfigChange({ populationCap: v })
        },
      ),
    )

    // Default replicator stats
    const statsHeader = document.createElement('h3')
    statsHeader.textContent = 'Default Stats'
    this.panel.appendChild(statsHeader)

    this.configSliders.push(
      this.addSlider(
        'Replication Rate',
        config.defaultStats.replicationRate,
        0,
        1,
        0.005,
        (v) => {
          this.callbacks.onConfigChange({
            defaultStats: { ...config.defaultStats, replicationRate: v },
          })
        },
      ),
    )

    this.configSliders.push(
      this.addSlider(
        'Death Rate',
        config.defaultStats.deathRate,
        0.005,
        1,
        0.005,
        (v) => {
          this.callbacks.onConfigChange({
            defaultStats: { ...config.defaultStats, deathRate: v },
          })
        },
      ),
    )

    this.configSliders.push(
      this.addSlider(
        'Mutation Rate',
        config.defaultStats.mutationRate,
        0,
        1,
        0.01,
        (v) => {
          this.callbacks.onConfigChange({
            defaultStats: { ...config.defaultStats, mutationRate: v },
          })
        },
      ),
    )

    this.configSliders.push(
      this.addSlider(
        'Movement Speed',
        config.defaultStats.speed,
        0,
        5,
        0.1,
        (v) => {
          this.callbacks.onConfigChange({
            defaultStats: { ...config.defaultStats, speed: v },
          })
        },
      ),
    )
  }

  private addSlider(
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (v: number) => void,
  ): HTMLInputElement {
    const group = document.createElement('div')
    group.className = 'control-group'

    const labelEl = document.createElement('label')
    const valueSpan = document.createElement('span')
    valueSpan.className = 'slider-value'
    valueSpan.textContent = String(value)
    labelEl.textContent = label + ' '
    labelEl.appendChild(valueSpan)

    const slider = document.createElement('input')
    slider.type = 'range'
    slider.min = String(min)
    slider.max = String(max)
    slider.step = String(step)
    slider.value = String(value)

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value)
      valueSpan.textContent = String(v)
      onChange(v)
    })

    group.appendChild(labelEl)
    group.appendChild(slider)
    this.panel.appendChild(group)

    return slider
  }

  private makeButton(text: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.textContent = text
    btn.addEventListener('click', onClick)
    return btn
  }

  lockConfig(): void {
    for (const slider of this.configSliders) {
      slider.disabled = true
    }
  }

  unlockConfig(): void {
    for (const slider of this.configSliders) {
      slider.disabled = false
    }
  }

  updateScrubBar(currentTick: number, frontierTick: number): void {
    this.scrubBar.max = String(frontierTick)
    if (!this.isScrubbing) {
      this.scrubBar.value = String(currentTick)
      this.scrubLabel.textContent = String(currentTick)
    }
  }

  updateStats(population: number, tick: number): void {
    this.popCounter.textContent = `Population: ${population}`
    this.tickCounter.textContent = `Tick: ${tick}`
  }

  showTooltip(r: Organism, screenX: number, screenY: number): void {
    this.tooltip.style.display = 'block'
    this.tooltip.style.left = `${screenX + 15}px`
    this.tooltip.style.top = `${screenY + 15}px`
    const stats = r.getStats()
    this.tooltip.innerHTML = `
      <strong>Replicator #${r.getId()}</strong><br>
      Replication: ${stats.replicationRate.toFixed(4)}<br>
      Death: ${stats.deathRate.toFixed(4)}<br>
      Mutation: ${stats.mutationRate.toFixed(4)}<br>
      Speed: ${stats.speed.toFixed(2)}<br>
      Color: <span style="color:${statsToColor(stats)}">&#9679;</span> ${statsToColor(stats)}
    `
  }

  hideTooltip(): void {
    this.tooltip.style.display = 'none'
  }
}
