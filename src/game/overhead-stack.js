// Overhead — "Stack" mini-game. Vanilla web component (from the Overhead Brand Kit).
// Tap / click / Space to drop the moving header bar onto the tower.
// Overhang gets trimmed; miss completely = game over. Themed to the logo bars.
// Best score persists in localStorage — nothing leaves the device.
(function () {
  const PALETTE = ['#E5484D', '#30A46C', '#F5A623', '#4C8DF0', '#8E4EC6', '#12A594'];
  const W = 300, H = 420, BH = 26;

  class OverheadStack extends HTMLElement {
    connectedCallback() {
      this.style.display = 'block';
      this.style.width = W + 'px';
      this.innerHTML =
        '<div style="width:' + W + 'px;background:#0C0D11;border:1px solid #26272F;border-radius:16px;overflow:hidden;font-family:Inter,sans-serif;box-shadow:0 24px 60px -20px rgba(0,0,0,.7);">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 15px;border-bottom:1px solid #26272F;">' +
            '<span style="font-size:13px;font-weight:700;color:#F4F5F7;">Overhead · Stack</span>' +
            '<span data-score style="font-family:\'JetBrains Mono\',monospace;font-size:12px;color:#8FB4FF;">0</span>' +
          '</div>' +
          '<canvas width="' + W + '" height="' + H + '" style="display:block;width:' + W + 'px;height:' + H + 'px;cursor:pointer;touch-action:manipulation;"></canvas>' +
        '</div>';
      this.canvas = this.querySelector('canvas');
      this.ctx = this.canvas.getContext('2d');
      this.scoreEl = this.querySelector('[data-score]');
      this.best = +(localStorage.getItem('overhead-stack-best') || 0);

      this.reset();
      const drop = (e) => { if (e) e.preventDefault(); this.drop(); };
      this.canvas.addEventListener('pointerdown', drop);
      this._key = (e) => { if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); this.drop(); } };
      window.addEventListener('keydown', this._key);

      this._raf = 0;
      this._tick = this.tick.bind(this);
      this._raf = requestAnimationFrame(this._tick);
    }
    disconnectedCallback() {
      cancelAnimationFrame(this._raf);
      window.removeEventListener('keydown', this._key);
    }
    reset() {
      const baseW = 180;
      this.blocks = [{ x: (W - baseW) / 2, w: baseW, c: '#26272F' }];
      this.speed = 2.0;
      this.over = false;
      this.falling = [];
      this.spawn();
      this.render();
    }
    spawn() {
      const prev = this.blocks[this.blocks.length - 1];
      this.moving = {
        x: 0, w: prev.w, dir: 1,
        c: PALETTE[(this.blocks.length - 1) % PALETTE.length]
      };
    }
    camera() {
      const visible = Math.floor((H - 70) / BH);
      return Math.max(0, this.blocks.length - visible);
    }
    yOf(i) {
      return H - 36 - (i - this.camera()) * BH;
    }
    drop() {
      if (this.over) { this.reset(); return; }
      const top = this.blocks[this.blocks.length - 1];
      const m = this.moving;
      const left = Math.max(m.x, top.x);
      const right = Math.min(m.x + m.w, top.x + top.w);
      const overlap = right - left;
      if (overlap <= 0) { this.gameOver(); return; }
      // trimmed overhang falls away
      if (m.x < top.x) this.falling.push({ x: m.x, w: top.x - m.x, y: this.yOf(this.blocks.length), c: m.c, vy: 0, vx: -1.5, a: 1 });
      else if (m.x + m.w > top.x + top.w) this.falling.push({ x: top.x + top.w, w: (m.x + m.w) - (top.x + top.w), y: this.yOf(this.blocks.length), c: m.c, vy: 0, vx: 1.5, a: 1 });
      this.blocks.push({ x: left, w: overlap, c: m.c });
      this.speed = Math.min(5.5, this.speed + 0.12);
      const score = this.blocks.length - 1;
      this.scoreEl.textContent = String(score);
      if (score > this.best) { this.best = score; localStorage.setItem('overhead-stack-best', String(score)); }
      this.spawn();
    }
    gameOver() { this.over = true; }
    tick() {
      if (!this.over && this.moving) {
        const m = this.moving;
        m.x += m.dir * this.speed;
        if (m.x + m.w > W) { m.x = W - m.w; m.dir = -1; }
        if (m.x < 0) { m.x = 0; m.dir = 1; }
      }
      for (const f of this.falling) { f.vy += 0.6; f.y += f.vy; f.x += f.vx; f.a -= 0.02; }
      this.falling = this.falling.filter((f) => f.a > 0);
      this.render();
      this._raf = requestAnimationFrame(this._tick);
    }
    bar(x, y, w, c, r) {
      const ctx = this.ctx, rad = r == null ? 6 : r;
      ctx.beginPath();
      ctx.roundRect(x, y, w, BH - 6, rad);
      ctx.fillStyle = c;
      ctx.fill();
    }
    render() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, W, H);
      // faint grid
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      for (let gx = 0; gx < W; gx += 24) for (let gy = 0; gy < H; gy += 24) ctx.fillRect(gx, gy, 1, 1);
      const cam = this.camera();
      for (let i = 0; i < this.blocks.length; i++) {
        if (i < cam - 1) continue;
        const b = this.blocks[i];
        this.bar(b.x, this.yOf(i), b.w, b.c);
      }
      for (const f of this.falling) { ctx.globalAlpha = Math.max(0, f.a); this.bar(f.x, f.y, f.w, f.c); ctx.globalAlpha = 1; }
      if (!this.over && this.moving) this.bar(this.moving.x, this.yOf(this.blocks.length), this.moving.w, this.moving.c);
      // HUD
      ctx.fillStyle = '#6B6E7A';
      ctx.font = '600 11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('best ' + this.best, 14, 22);
      if (this.over) {
        ctx.fillStyle = 'rgba(12,13,17,0.82)';
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#F4F5F7';
        ctx.font = '800 26px Inter, sans-serif';
        ctx.fillText('Stack toppled', W / 2, H / 2 - 18);
        ctx.fillStyle = '#8FB4FF';
        ctx.font = '600 14px Inter, sans-serif';
        ctx.fillText('height ' + (this.blocks.length - 1) + '  ·  best ' + this.best, W / 2, H / 2 + 10);
        ctx.fillStyle = '#9A9DAB';
        ctx.font = '500 13px Inter, sans-serif';
        ctx.fillText('tap to try again', W / 2, H / 2 + 40);
      } else {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#6B6E7A';
        ctx.font = '500 12px Inter, sans-serif';
        ctx.fillText(this.blocks.length <= 1 ? 'tap or press space to drop' : '', W / 2, 22);
      }
    }
  }
  if (!customElements.get('overhead-stack')) customElements.define('overhead-stack', OverheadStack);
})();
