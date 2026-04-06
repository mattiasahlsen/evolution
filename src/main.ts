import './style.css'
import { Simulation } from './simulation/simulation'
import { Renderer } from './renderer'
import { UI } from './ui'
import { DEFAULT_SIM_CONFIG } from './simulation/config'
import type { SimConfig } from './simulation/config'

const config: SimConfig = { ...DEFAULT_SIM_CONFIG }

const app = document.getElementById('app')!

// Canvas
const canvas = document.createElement('canvas')
canvas.id = 'sim-canvas'
app.appendChild(canvas)

// Simulation & renderer
const simulation = new Simulation(config)
const renderer = new Renderer(canvas)

function resizeCanvas(): void {
  const panelWidth = 260
  config.width = window.innerWidth - panelWidth
  config.height = window.innerHeight
  renderer.resize(config.width, config.height)
}

// UI
let running = false
let tickAccumulator = 0
let frontierTick = 0

const ui = new UI(app, config, {
  onPlay: () => {
    // Restore frontier if we scrubbed backward
    if (simulation.getTickCount() < frontierTick) {
      simulation.seekToTick(frontierTick)
    }
    // Store initial checkpoint on first play
    if (simulation.getTickCount() === 0) {
      simulation.storeInitialCheckpoint()
    }
    running = true
    tickAccumulator = 0
    ui.lockConfig()
  },
  onPause: () => {
    running = false
  },
  onStep: () => {
    running = false
    tickAccumulator = 0
    // Restore frontier if we scrubbed backward
    if (simulation.getTickCount() < frontierTick) {
      simulation.seekToTick(frontierTick)
    }
    // Store initial checkpoint on first step
    if (simulation.getTickCount() === 0 && !simulation.hasCheckpoint(0)) {
      simulation.storeInitialCheckpoint()
    }
    ui.lockConfig()
    simulation.tick()
    frontierTick = simulation.getTickCount()
    renderer.render(simulation.getReplicators())
    ui.updateStats(
      simulation.getReplicators().length,
      simulation.getTickCount(),
    )
    ui.updateScrubBar(simulation.getTickCount(), frontierTick)
  },
  onReset: () => {
    running = false
    tickAccumulator = 0
    frontierTick = 0
    simulation.reset()
    renderer.render(simulation.getReplicators())
    ui.updateStats(0, 0)
    ui.updateScrubBar(0, 0)
    ui.unlockConfig()
  },
  onConfigChange: (partial) => {
    Object.assign(config, partial)
  },
  onScrub: (tick: number) => {
    running = false
    simulation.seekToTick(tick)
    renderer.render(simulation.getReplicators())
    ui.updateStats(
      simulation.getReplicators().length,
      simulation.getTickCount(),
    )
  },
})

// Move panel before canvas in DOM so it appears on the left
const panel = app.querySelector('.controls-panel')!
app.insertBefore(panel, canvas)

// Click to inspect
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const found = renderer.findOrganismAt(x, y, simulation.getReplicators())
  if (found) {
    ui.showTooltip(found, e.clientX, e.clientY)
  } else {
    ui.hideTooltip()
  }
})

// Resize
window.addEventListener('resize', resizeCanvas)
resizeCanvas()

// Initial render
renderer.render(simulation.getReplicators())

// Main loop
function loop(): void {
  if (running) {
    tickAccumulator += config.ticksPerFrame
    const wholeTicks = Math.floor(tickAccumulator)
    tickAccumulator -= wholeTicks
    for (let i = 0; i < wholeTicks; i++) {
      simulation.tick()
    }
    frontierTick = simulation.getTickCount()
    renderer.render(simulation.getReplicators())
    ui.updateStats(
      simulation.getReplicators().length,
      simulation.getTickCount(),
    )
    ui.updateScrubBar(simulation.getTickCount(), frontierTick)
  }
  requestAnimationFrame(loop)
}

requestAnimationFrame(loop)
