import { EventBus } from './EventBus.js';
export const EngineState = { STOPPED: 'stopped', RUNNING: 'running', PAUSED: 'paused' };
export class Engine {
  constructor() {
    this.state = EngineState.STOPPED;
    this._phases = { update: [], render: [], lateUpdate: [] };
    this._frameId = null; this._lastTime = 0; this._accumulator = 0;
    this.fixedTimestep = 1/60; this.maxDelta = 0.1; this.timeScale = 1.0;
    this.frameCount = 0; this.elapsed = 0; this._cleanup = [];
    this._unsubs = [
      EventBus.on('engine:pause', () => this.pause()),
      EventBus.on('engine:resume', () => this.resume()),
      EventBus.on('engine:setspeed', e => { this.timeScale = e.speed; }),
    ];
  }
  addSystem(system, phase = 'update', priority = 0) {
    if (!this._phases[phase]) throw new Error(`Unknown phase: ${phase}`);
    this._phases[phase].push({ priority, system });
    this._phases[phase].sort((a, b) => b.priority - a.priority);
    return () => this.removeSystem(system, phase);
  }
  removeSystem(system, phase) { if (this._phases[phase]) this._phases[phase] = this._phases[phase].filter(e => e.system !== system); }
  onCleanup(fn) { this._cleanup.push(fn); }
  start(ts) {
    if (this.state === EngineState.RUNNING) return;
    this.state = EngineState.RUNNING; this._lastTime = ts || performance.now();
    this._accumulator = 0; this.frameCount = 0; this.elapsed = 0;
    EventBus.emit('engine:started', { timestamp: this._lastTime });
    this._tick(this._lastTime);
  }
  stop() {
    if (this._frameId !== null) { cancelAnimationFrame(this._frameId); this._frameId = null; }
    this.state = EngineState.STOPPED;
    for (const fn of this._cleanup) try { fn(); } catch (e) { console.error(e); }
    this._cleanup.length = 0; EventBus.emit('engine:stopped', {});
  }
  pause() {
    if (this.state !== EngineState.RUNNING) return;
    this.state = EngineState.PAUSED;
    if (this._frameId !== null) { cancelAnimationFrame(this._frameId); this._frameId = null; }
    EventBus.emit('engine:paused', { elapsed: this.elapsed });
  }
  resume() {
    if (this.state !== EngineState.PAUSED) return;
    this.state = EngineState.RUNNING; this._lastTime = performance.now();
    EventBus.emit('engine:resumed', {});
    this._tick(this._lastTime);
  }
  _tick(ts) {
    if (this.state !== EngineState.RUNNING) return;
    const raw = (ts - this._lastTime) / 1000; this._lastTime = ts;
    const delta = Math.min(raw, this.maxDelta);
    const scaled = delta * this.timeScale;
    this._accumulator += scaled;
    while (this._accumulator >= this.fixedTimestep) {
      this._runPhase('update', this.fixedTimestep);
      this._accumulator -= this.fixedTimestep;
      this.elapsed += this.fixedTimestep;
    }
    this._runPhase('render', delta);
    this._runPhase('lateUpdate', delta);
    this.frameCount++;
    this._frameId = requestAnimationFrame(t => this._tick(t));
  }
  _runPhase(phase, delta) {
    for (const { system } of this._phases[phase]) {
      if (typeof system[phase] === 'function') { try { system[phase](delta); } catch (e) { console.error(`[Engine]`, e); } }
    }
  }
  get isRunning() { return this.state === EngineState.RUNNING; }
  get isPaused() { return this.state === EngineState.PAUSED; }
  getFPS() { return this.frameCount / (this.elapsed || 0.001); }
  dispose() { this.stop(); for (const fn of this._unsubs) fn(); for (const k of Object.keys(this._phases)) this._phases[k].length = 0; }
}
