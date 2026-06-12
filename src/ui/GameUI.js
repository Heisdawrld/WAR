export class GameUI {
  constructor() {
    this.elements = {
      splash: document.getElementById('splash'),
      mainMenu: document.getElementById('main-menu'),
      armyBuilder: document.getElementById('army-builder'),
      battleScreen: document.getElementById('battle-screen'),
      results: document.getElementById('results'),
      loaderBar: document.getElementById('loader-bar'),
      loaderPercent: document.getElementById('loader-percent'),
      unitCountDisplay: document.getElementById('unit-count-display'),
      activeSideLabel: document.getElementById('active-side-label'),
      redCount: document.getElementById('red-count'),
      blueCount: document.getElementById('blue-count'),
      redHp: document.getElementById('red-hp'),
      blueHp: document.getElementById('blue-hp'),
      battleTimer: document.getElementById('battle-timer'),
      resultBadge: document.getElementById('result-badge'),
      resultTitle: document.getElementById('result-title'),
      statsGrid: document.getElementById('stats-grid'),
      unitCarousel: document.getElementById('unit-carousel'),
      formationTools: document.getElementById('formation-tools'),
      minimapCanvas: document.getElementById('minimap-canvas'),
      hintBar: document.getElementById('hint-bar'),
      armyPreview: document.getElementById('army-preview'),
      fightBtn: document.getElementById('fight-btn'),
      deployZone: document.getElementById('deploy-zone')
    };
    this.currentScreen = 'splash';
    this._hintTimeout = null;
  }

  showScreen(name) {
    const map = {
      splash: this.elements.splash,
      'main-menu': this.elements.mainMenu,
      'army-builder': this.elements.armyBuilder,
      battle: this.elements.battleScreen,
      results: this.elements.results
    };
    for (const [key, el] of Object.entries(map)) {
      if (el) el.classList.toggle('hidden', key !== name);
    }
    this.currentScreen = name;
  }

  setLoaderProgress(pct) {
    if (this.elements.loaderBar) {
      this.elements.loaderBar.style.width = `${pct}%`;
    }
    if (this.elements.loaderPercent) {
      this.elements.loaderPercent.textContent = `${Math.round(pct)}%`;
    }
  }

  updateUnitCount(current, max) {
    if (this.elements.unitCountDisplay) {
      this.elements.unitCountDisplay.textContent = `${current} / ${max}`;
    }
    // Show/hide deploy zone based on unit count
    if (this.elements.deployZone) {
      if (current > 0) {
        this.elements.deployZone.classList.add('hidden');
      } else {
        this.elements.deployZone.classList.remove('hidden');
      }
    }
  }

  updateArmyPreview(composition) {
    const el = this.elements.armyPreview;
    if (!el) return;
    const entries = Object.entries(composition);
    if (entries.length === 0) {
      el.innerHTML = '<span class="preview-empty">No units deployed</span>';
      return;
    }
    el.innerHTML = entries.map(([type, count]) =>
      `<span class="preview-item"><span class="preview-count">${count}</span> ${type}</span>`
    ).join('');
  }

  showHint(text) {
    const el = this.elements.hintBar;
    if (!el) return;
    el.textContent = text;
    el.classList.add('visible');
    clearTimeout(this._hintTimeout);
    this._hintTimeout = setTimeout(() => this.hideHint(), 8000);
  }

  hideHint() {
    const el = this.elements.hintBar;
    if (!el) return;
    el.classList.remove('visible');
    clearTimeout(this._hintTimeout);
  }

  shakeFightButton() {
    const btn = this.elements.fightBtn || document.querySelector('[data-action="start-battle"]');
    if (!btn) return;
    btn.classList.add('shake');
    setTimeout(() => btn.classList.remove('shake'), 600);
  }

  updateBattleHUD(stats) {
    if (this.elements.redCount) this.elements.redCount.textContent = stats.redAlive;
    if (this.elements.blueCount) this.elements.blueCount.textContent = stats.blueAlive;
    if (this.elements.redHp) this.elements.redHp.style.width = `${(stats.redHp || 0) * 100}%`;
    if (this.elements.blueHp) this.elements.blueHp.style.width = `${(stats.blueHp || 0) * 100}%`;
  }

  updateTimer(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    if (this.elements.battleTimer) this.elements.battleTimer.textContent = `${m}:${s}`;
  }

  showResults(winner, stats) {
    this.showScreen('results');
    if (this.elements.resultBadge) {
      this.elements.resultBadge.textContent = winner === 'red' ? 'VICTORY' : 'DEFEAT';
      this.elements.resultBadge.className = `result-badge ${winner === 'red' ? 'victory' : 'defeat'}`;
    }
    if (this.elements.resultTitle) {
      this.elements.resultTitle.textContent = winner === 'red' ? 'RED ARMY WINS' : 'BLUE ARMY WINS';
      this.elements.resultTitle.className = `result-title ${winner === 'red' ? 'victory' : 'defeat'}`;
    }
    if (this.elements.statsGrid) {
      const winColor = winner === 'red' ? '#ff4444' : '#4488ff';
      const loseColor = winner === 'red' ? '#4488ff' : '#ff4444';
      this.elements.statsGrid.innerHTML = `
        <div class="stat-item"><div class="stat-value" style="color:${winColor}">${stats.redAlive}</div><div class="stat-label">Red Survivors</div></div>
        <div class="stat-item"><div class="stat-value" style="color:${loseColor}">${stats.blueAlive}</div><div class="stat-label">Blue Survivors</div></div>
        <div class="stat-item"><div class="stat-value">${stats.redTotal}</div><div class="stat-label">Red Deployed</div></div>
        <div class="stat-item"><div class="stat-value">${stats.blueTotal}</div><div class="stat-label">Blue Deployed</div></div>
      `;
    }
  }

  setActiveSide(side) {
    if (this.elements.activeSideLabel) {
      this.elements.activeSideLabel.textContent = side === 'red' ? 'RED ARMY' : 'BLUE ARMY';
      this.elements.activeSideLabel.className = `army-label ${side}`;
    }
    const toggle = document.getElementById('side-toggle');
    if (toggle) {
      toggle.textContent = side === 'red' ? 'BLUE →' : '← RED';
    }
  }
}
