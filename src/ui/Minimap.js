export class Minimap {
  constructor(canvas, terrain, unitManager) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.terrain = terrain;
    this.unitManager = unitManager;
    this.size = 120;
    this.canvas.width = this.size;
    this.canvas.height = this.size;
  }

  render() {
    const ctx = this.ctx;
    const s = this.size;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, s, s);

    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();

    const scale = s / (this.terrain?.size || 200);
    const offset = s / 2;
    const units = this.unitManager.getAliveUnits();

    for (const unit of units) {
      const x = unit.position.x * scale + offset;
      const y = unit.position.z * scale + offset;
      const dist = Math.sqrt((x - s / 2) ** 2 + (y - s / 2) ** 2);
      if (dist > s / 2 - 2) continue;

      ctx.fillStyle = unit.side === 'red' ? '#ff4444' : '#4488ff';
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
