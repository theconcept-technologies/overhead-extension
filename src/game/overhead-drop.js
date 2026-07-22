// Overhead — "Headerfall" mini-game. Vanilla web component.
// Falling-block puzzle themed to HTTP headers. Arrows move, Z/X/↑ rotate,
// Space hard-drops, C holds, P pauses. Clears score HTTP status jokes.
(function () {
  const COLS = 10, ROWS = 18, CELL = 24;
  const BX = 10, BY = 10, BW = COLS * CELL, BH = ROWS * CELL;
  const W = 330, H = BH + 20;
  const PIECES = [
    { n: 'X-Request-ID', c: '#4C8DF0', m: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]] },
    { n: 'Cache-Control', c: '#F5A623', m: [[1,1],[1,1]] },
    { n: 'Content-Type', c: '#8E4EC6', m: [[0,1,0],[1,1,1],[0,0,0]] },
    { n: 'X-Env: DEV', c: '#30A46C', m: [[0,1,1],[1,1,0],[0,0,0]] },
    { n: 'X-Env: LIVE', c: '#E5484D', m: [[1,1,0],[0,1,1],[0,0,0]] },
    { n: 'Authorization', c: '#12A594', m: [[1,0,0],[1,1,1],[0,0,0]] },
    { n: 'Accept', c: '#4E5BF6', m: [[0,0,1],[1,1,1],[0,0,0]] }
  ];
  const CLEAR_PTS = [0, 100, 300, 500, 800];
  const CLEAR_TXT = ['', '200 OK', '204 FLUSHED', '301 TRIPLE', '418 OVERHEAD!'];
  const rot = (m) => m[0].map((_, i) => m.map((r) => r[i]).reverse());

  class OverheadDrop extends HTMLElement {
    connectedCallback() {
      this.style.display = 'block';
      this.style.width = W + 'px';
      this.innerHTML =
        '<div tabindex="0" style="width:' + W + 'px;background:#0C0D11;border:1px solid #26272F;border-radius:16px;overflow:hidden;font-family:Inter,sans-serif;box-shadow:0 24px 60px -20px rgba(0,0,0,.7);outline:none;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 15px;border-bottom:1px solid #26272F;">' +
            '<span style="font-size:13px;font-weight:700;color:#F4F5F7;">Overhead · Headerfall</span>' +
            '<span data-score style="font-family:\'JetBrains Mono\',monospace;font-size:12px;color:#8FB4FF;">0</span>' +
          '</div>' +
          '<canvas width="' + W + '" height="' + H + '" style="display:block;width:' + W + 'px;height:' + H + 'px;cursor:pointer;touch-action:manipulation;"></canvas>' +
          '<div data-pad style="display:flex;gap:6px;padding:8px 10px;border-top:1px solid #26272F;">' +
            ['◀','▶','⟳','▼','⤓'].map((g, i) =>
              '<button data-b="' + i + '" style="flex:1;height:38px;border:1px solid #26272F;border-radius:9px;background:#16171D;color:#C7CAD6;font-size:15px;cursor:pointer;">' + g + '</button>').join('') +
          '</div>' +
        '</div>';
      this.root = this.firstElementChild;
      this.canvas = this.querySelector('canvas');
      this.ctx = this.canvas.getContext('2d');
      this.scoreEl = this.querySelector('[data-score]');
      this.best = +(localStorage.getItem('overhead-drop-best') || 0);
      this.started = false;
      this.reset();

      this._key = (e) => this.onKey(e);
      this.root.addEventListener('keydown', this._key);
      this.canvas.addEventListener('pointerdown', () => { this.root.focus(); this.startOrRestart(); });
      const acts = [() => this.move(-1), () => this.move(1), () => this.rotate(1), () => this.softDrop(), () => this.hardDrop()];
      this.querySelectorAll('[data-b]').forEach((b) => {
        b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.root.focus(); if (!this.started || this.over) this.startOrRestart(); else acts[+b.dataset.b](); });
      });
      this.root.addEventListener('blur', () => { if (this.started && !this.over) this.paused = true; });

      this._last = performance.now();
      this._tick = (t) => { this.step(t); this._raf = requestAnimationFrame(this._tick); };
      this._raf = requestAnimationFrame(this._tick);
    }
    disconnectedCallback() { cancelAnimationFrame(this._raf); }

    reset() {
      this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
      this.bag = []; this.queue = [];
      while (this.queue.length < 3) this.queue.push(this.draw());
      this.hold = null; this.canHold = true;
      this.score = 0; this.lines = 0; this.level = 1; this.combo = -1;
      this.over = false; this.paused = false;
      this.clearing = null; this.floats = [];
      this.acc = 0;
      this.spawn();
      this.updateScore();
    }
    draw() {
      if (!this.bag.length) { this.bag = PIECES.map((_, i) => i); for (let i = this.bag.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]]; } }
      return this.bag.pop();
    }
    spawn(idx) {
      const i = idx != null ? idx : this.queue.shift();
      if (idx == null) this.queue.push(this.draw());
      const p = PIECES[i];
      this.cur = { i, m: p.m.map((r) => r.slice()), x: ((COLS - p.m[0].length) / 2) | 0, y: -1, c: p.c };
      if (this.collides(this.cur.m, this.cur.x, this.cur.y + 1)) { this.over = true; this.saveBest(); }
    }
    collides(m, x, y) {
      for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) {
        if (!m[r][c]) continue;
        const gx = x + c, gy = y + r;
        if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
        if (gy >= 0 && this.grid[gy][gx]) return true;
      }
      return false;
    }
    move(dx) { if (this.blocked()) return; if (!this.collides(this.cur.m, this.cur.x + dx, this.cur.y)) this.cur.x += dx; }
    rotate(dir) {
      if (this.blocked()) return;
      let m = this.cur.m; for (let i = 0; i < (dir === 1 ? 1 : 3); i++) m = rot(m);
      for (const k of [0, -1, 1, -2, 2]) {
        if (!this.collides(m, this.cur.x + k, this.cur.y)) { this.cur.m = m; this.cur.x += k; return; }
      }
    }
    softDrop() { if (this.blocked()) return; if (!this.collides(this.cur.m, this.cur.x, this.cur.y + 1)) { this.cur.y++; this.score++; this.updateScore(); } else this.lock(); }
    hardDrop() {
      if (this.blocked()) return;
      let d = 0; while (!this.collides(this.cur.m, this.cur.x, this.cur.y + 1)) { this.cur.y++; d++; }
      this.score += d * 2; this.lock();
    }
    doHold() {
      if (this.blocked() || !this.canHold) return;
      const was = this.cur.i;
      if (this.hold == null) { this.hold = was; this.spawn(); } else { const h = this.hold; this.hold = was; this.spawn(h); }
      this.canHold = false;
    }
    blocked() { return this.over || this.paused || !this.started || this.clearing; }
    lock() {
      const { m, x, y, c } = this.cur;
      for (let r = 0; r < m.length; r++) for (let cc = 0; cc < m[r].length; cc++) {
        if (m[r][cc] && y + r >= 0) this.grid[y + r][x + cc] = c;
      }
      this.canHold = true;
      const full = [];
      for (let r = 0; r < ROWS; r++) if (this.grid[r].every(Boolean)) full.push(r);
      if (full.length) {
        this.combo++;
        const pts = CLEAR_PTS[full.length] * this.level + this.combo * 50;
        this.score += pts;
        this.floats.push({ text: CLEAR_TXT[full.length] + '  +' + pts, y: BY + full[0] * CELL, a: 1 });
        this.clearing = { rows: full, t: 0 };
      } else { this.combo = -1; this.spawn(); }
      this.updateScore();
    }
    finishClear() {
      const rows = this.clearing.rows;
      for (const r of rows) { this.grid.splice(r, 1); this.grid.unshift(Array(COLS).fill(null)); }
      this.lines += rows.length;
      const nl = 1 + ((this.lines / 10) | 0);
      if (nl > this.level) { this.level = nl; this.floats.push({ text: 'LEVEL ' + nl, y: BY + BH / 2, a: 1 }); }
      this.clearing = null;
      this.spawn();
    }
    saveBest() { if (this.score > this.best) { this.best = this.score; localStorage.setItem('overhead-drop-best', this.best); } }
    updateScore() { this.scoreEl.textContent = this.score + (this.best ? ' · best ' + Math.max(this.best, this.score) : ''); }
    startOrRestart() { if (!this.started) { this.started = true; } else if (this.over) { this.reset(); } else if (this.paused) { this.paused = false; } }
    onKey(e) {
      const k = e.key;
      if (['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' ','z','x','c','p','Z','X','C','P'].includes(k)) e.preventDefault();
      if (!this.started || this.over) { if (k === ' ' || k === 'Enter') this.startOrRestart(); return; }
      if (k === 'p' || k === 'P') { this.paused = !this.paused; return; }
      if (this.paused) { this.paused = false; return; }
      if (k === 'ArrowLeft') this.move(-1);
      else if (k === 'ArrowRight') this.move(1);
      else if (k === 'ArrowDown') this.softDrop();
      else if (k === 'ArrowUp' || k === 'x' || k === 'X') this.rotate(1);
      else if (k === 'z' || k === 'Z') this.rotate(-1);
      else if (k === ' ') this.hardDrop();
      else if (k === 'c' || k === 'C') this.doHold();
    }
    step(t) {
      const dt = Math.min(50, t - this._last); this._last = t;
      if (this.started && !this.over && !this.paused) {
        if (this.clearing) {
          this.clearing.t += dt;
          if (this.clearing.t > 220) this.finishClear();
        } else {
          this.acc += dt;
          const interval = Math.max(80, 720 - (this.level - 1) * 65);
          if (this.acc >= interval) {
            this.acc = 0;
            if (!this.collides(this.cur.m, this.cur.x, this.cur.y + 1)) this.cur.y++;
            else this.lock();
          }
        }
      }
      for (const f of this.floats) { f.y -= dt * 0.03; f.a -= dt * 0.0012; }
      this.floats = this.floats.filter((f) => f.a > 0);
      this.render();
    }
    cell(x, y, c, ghost) {
      const ctx = this.ctx;
      if (ghost) { ctx.strokeStyle = c; ctx.globalAlpha = 0.35; ctx.strokeRect(x + 2.5, y + 2.5, CELL - 5, CELL - 5); ctx.globalAlpha = 1; return; }
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.roundRect(x + 1.5, y + 1.5, CELL - 3, CELL - 3, 5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.beginPath(); ctx.roundRect(x + 1.5, y + 1.5, CELL - 3, 7, 5); ctx.fill();
    }
    mini(px, py, i, scale) {
      const p = PIECES[i], s = scale || 8;
      this.ctx.fillStyle = p.c;
      for (let r = 0; r < p.m.length; r++) for (let c = 0; c < p.m[r].length; c++) {
        if (p.m[r][c]) { this.ctx.beginPath(); this.ctx.roundRect(px + c * s, py + r * s, s - 1.5, s - 1.5, 2); this.ctx.fill(); }
      }
    }
    render() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0C0D11'; ctx.fillRect(0, 0, W, H);
      // board
      ctx.fillStyle = '#101117'; ctx.beginPath(); ctx.roundRect(BX, BY, BW, BH, 10); ctx.fill();
      ctx.strokeStyle = '#1C1D25'; ctx.lineWidth = 1;
      for (let c = 1; c < COLS; c++) { ctx.beginPath(); ctx.moveTo(BX + c * CELL + 0.5, BY + 4); ctx.lineTo(BX + c * CELL + 0.5, BY + BH - 4); ctx.stroke(); }
      const flash = this.clearing && ((this.clearing.t / 55) | 0) % 2 === 0;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const v = this.grid[r][c]; if (!v) continue;
        const isClr = this.clearing && this.clearing.rows.includes(r);
        this.cell(BX + c * CELL, BY + r * CELL, isClr && flash ? '#F4F5F7' : v);
      }
      if (this.cur && !this.over && !this.clearing) {
        // ghost
        let gy = this.cur.y; while (!this.collides(this.cur.m, this.cur.x, gy + 1)) gy++;
        for (let r = 0; r < this.cur.m.length; r++) for (let c = 0; c < this.cur.m[r].length; c++) {
          if (!this.cur.m[r][c]) continue;
          if (gy + r >= 0 && gy !== this.cur.y) this.cell(BX + (this.cur.x + c) * CELL, BY + (gy + r) * CELL, this.cur.c, true);
          if (this.cur.y + r >= 0) this.cell(BX + (this.cur.x + c) * CELL, BY + (this.cur.y + r) * CELL, this.cur.c);
        }
      }
      // sidebar
      const sx = BX + BW + 10;
      ctx.fillStyle = '#6B6E7A'; ctx.font = '700 9px Inter,sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('NEXT', sx, BY + 12);
      this.queue.forEach((q, i) => this.mini(sx, BY + 20 + i * 34, q));
      ctx.fillText('HOLD', sx, BY + 136);
      if (this.hold != null) this.mini(sx, BY + 144, this.hold);
      else { ctx.strokeStyle = '#26272F'; ctx.strokeRect(sx + 0.5, BY + 144.5, 30, 22); }
      ctx.fillStyle = '#6B6E7A';
      ctx.fillText('LEVEL', sx, BY + 204); ctx.fillText('LINES', sx, BY + 244);
      ctx.fillStyle = '#C7CAD6'; ctx.font = '700 15px "JetBrains Mono",monospace';
      ctx.fillText('' + this.level, sx, BY + 222); ctx.fillText('' + this.lines, sx, BY + 262);
      // floats
      ctx.textAlign = 'center';
      for (const f of this.floats) {
        ctx.globalAlpha = Math.max(0, f.a);
        ctx.fillStyle = '#8FB4FF'; ctx.font = '800 15px "JetBrains Mono",monospace';
        ctx.fillText(f.text, BX + BW / 2, f.y); ctx.globalAlpha = 1;
      }
      // overlays
      if (!this.started || this.over || this.paused) {
        ctx.fillStyle = 'rgba(12,13,17,0.82)'; ctx.beginPath(); ctx.roundRect(BX, BY, BW, BH, 10); ctx.fill();
        ctx.textAlign = 'center'; ctx.fillStyle = '#F4F5F7';
        if (this.over) {
          ctx.font = '800 22px "JetBrains Mono",monospace'; ctx.fillStyle = '#E5484D';
          ctx.fillText('502', BX + BW / 2, BY + BH / 2 - 34);
          ctx.fillStyle = '#F4F5F7'; ctx.font = '700 15px Inter,sans-serif';
          ctx.fillText('Bad Gateway', BX + BW / 2, BY + BH / 2 - 10);
          ctx.fillStyle = '#9A9DAB'; ctx.font = '400 12px Inter,sans-serif';
          ctx.fillText('Too much overhead in the stack.', BX + BW / 2, BY + BH / 2 + 12);
          ctx.fillStyle = '#8FB4FF'; ctx.font = '600 12px Inter,sans-serif';
          ctx.fillText('Click to retry the request', BX + BW / 2, BY + BH / 2 + 38);
        } else if (this.paused) {
          ctx.font = '700 16px Inter,sans-serif';
          ctx.fillText('Paused — 425 Too Early', BX + BW / 2, BY + BH / 2);
          ctx.fillStyle = '#9A9DAB'; ctx.font = '400 12px Inter,sans-serif';
          ctx.fillText('P or click to resume', BX + BW / 2, BY + BH / 2 + 22);
        } else {
          ctx.font = '800 18px Inter,sans-serif';
          ctx.fillText('Headerfall', BX + BW / 2, BY + BH / 2 - 26);
          ctx.fillStyle = '#9A9DAB'; ctx.font = '400 12px Inter,sans-serif';
          ctx.fillText('Click to start', BX + BW / 2, BY + BH / 2 - 2);
          ctx.fillText('← → move · ↑ rotate · space drop', BX + BW / 2, BY + BH / 2 + 20);
          ctx.fillText('C hold · P pause', BX + BW / 2, BY + BH / 2 + 38);
        }
      }
    }
  }
  if (!customElements.get('overhead-drop')) customElements.define('overhead-drop', OverheadDrop);
})();
