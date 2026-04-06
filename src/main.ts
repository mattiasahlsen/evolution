import './style.css';
import { Simulation } from './simulation';
import { Renderer } from './renderer';
import { UI } from './ui';
import { DEFAULT_CONFIG } from './types';
import type { SimConfig } from './types';

const config: SimConfig = { ...DEFAULT_CONFIG };

const app = document.getElementById('app')!;

// Canvas
const canvas = document.createElement('canvas');
canvas.id = 'sim-canvas';
app.appendChild(canvas);

// Simulation & renderer
const simulation = new Simulation(config);
const renderer = new Renderer(canvas);

function resizeCanvas(): void {
  const panelWidth = 260;
  config.width = window.innerWidth - panelWidth;
  config.height = window.innerHeight;
  renderer.resize(config.width, config.height);
}

// UI
let running = true;

const ui = new UI(app, config, {
  onPlay: () => {
    running = true;
  },
  onPause: () => {
    running = false;
  },
  onStep: () => {
    running = false;
    simulation.tick();
    renderer.render(simulation.replicators);
    ui.updateStats(simulation.replicators.length, simulation.tickCount);
  },
  onReset: () => {
    simulation.reset();
    renderer.render(simulation.replicators);
    ui.updateStats(0, 0);
  },
  onConfigChange: (partial) => {
    Object.assign(config, partial);
  },
});

// Move panel before canvas in DOM so it appears on the left
const panel = app.querySelector('.controls-panel')!;
app.insertBefore(panel, canvas);

// Click to inspect
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const found = renderer.findReplicatorAt(x, y, simulation.replicators);
  if (found) {
    ui.showTooltip(found, e.clientX, e.clientY);
  } else {
    ui.hideTooltip();
  }
});

// Resize
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Main loop
function loop(): void {
  if (running) {
    for (let i = 0; i < config.ticksPerFrame; i++) {
      simulation.tick();
    }
    renderer.render(simulation.replicators);
    ui.updateStats(simulation.replicators.length, simulation.tickCount);
  }
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
