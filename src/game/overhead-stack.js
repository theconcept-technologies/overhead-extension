// Overhead — "Protocol Stack" mini-game.
// Stack fictional request/response headers; no configured header values are read.
// Scores stay local to the browser.
(function () {
  const PALETTE = ['#E5484D', '#30A46C', '#F5A623', '#4C8DF0', '#8E4EC6', '#12A594'];
  const HEADERS = {
    request: ['Accept', 'User-Agent', 'Cache-Control', 'Content-Type', 'Authorization'],
    response: ['Content-Type', 'ETag', 'Server-Timing', 'Vary', 'Permissions-Policy'],
  };
  const COPY = {
    en: {
      title: 'Overhead · Protocol Stack', best: 'BEST', combo: 'COMBO', max: 'MAX', request: 'REQUEST', response: 'RESPONSE',
      intro: 'tap or press space to drop', perfect: 'PERFECT', clean: 'CLEAN', recovered: '+ edge restored',
      toppled: '431 HEADER TOO LARGE', height: 'height', retry: 'tap or press space to retry', start: 'START REQUEST',
      startHint: 'Stack headers. Trim overhead. Build a streak.', points: 'PTS', newBest: 'NEW HIGH SCORE',
      phase: 'PHASE', secured: 'CONNECTION SECURED', route: 'ROUTING TO', bonus: 'PHASE BONUS',
      share: 'SHARE', saved: 'SAVED', fever: 'PROTOCOL FEVER', rank: 'RANK',
      aria: 'Protocol Stack game. Drop the moving HTTP header with Space or Enter.',
    },
    de: {
      title: 'Overhead · Protocol Stack', best: 'BESTE', combo: 'COMBO', max: 'MAX', request: 'REQUEST', response: 'RESPONSE',
      intro: 'Tippen oder Leertaste zum Ablegen', perfect: 'PERFEKT', clean: 'SAUBER', recovered: '+ Kante repariert',
      toppled: '431 HEADER TOO LARGE', height: 'Höhe', retry: 'Tippen oder Leertaste für Neustart', start: 'REQUEST STARTEN',
      startHint: 'Header stapeln. Overhead trimmen. Serie bauen.', points: 'PKT', newBest: 'NEUER HIGHSCORE',
      phase: 'PHASE', secured: 'VERBINDUNG STEHT', route: 'WEITER ZU', bonus: 'PHASENBONUS',
      share: 'TEILEN', saved: 'GESPEICHERT', fever: 'PROTOCOL FEVER', rank: 'RANG',
      aria: 'Protocol-Stack-Spiel. Lege den bewegten HTTP-Header mit Leertaste oder Enter ab.',
    },
  };
  const MILESTONES = [
    { code: '200 OK', label: 'HANDSHAKE COMPLETE' },
    { code: '304 NOT MODIFIED', label: 'CACHE ROUTE LOCKED' },
    { code: '101 SWITCHING', label: 'PROTOCOL UPGRADED' },
    { code: '204 NO CONTENT', label: 'CLEAN TRANSFER' },
  ];
  const W = 300, H = 360, BH = 27, BASE_W = 184;

  function readNumber(key) {
    try { return +(localStorage.getItem(key) || 0); } catch (_) { return 0; }
  }
  function writeNumber(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (_) { /* storage can be unavailable */ }
  }

  class OverheadStack extends HTMLElement {
    connectedCallback() {
      this.lang = (navigator.language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en';
      this.copy = COPY[this.lang];
      this.style.display = 'block';
      this.style.width = W + 'px';
      this.innerHTML =
        '<div style="width:' + W + 'px;background:#0C0D11;border:1px solid #26272F;border-radius:16px;overflow:hidden;font-family:ui-sans-serif,system-ui,sans-serif;box-shadow:0 24px 60px -20px rgba(0,0,0,.7);">' +
          '<style>canvas:focus-visible{box-shadow:inset 0 0 0 2px #8FB4FF}</style>' +
          '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px 8px 14px;border-bottom:1px solid #26272F;min-height:41px;box-sizing:border-box;">' +
            '<span data-title style="font-size:12px;font-weight:750;letter-spacing:-.01em;color:#F4F5F7;">' + this.copy.title + '</span>' +
            '<span style="display:flex;align-items:center;gap:7px;">' +
              '<span data-score aria-live="polite" style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:#8FB4FF;">0</span>' +
              '<button data-export type="button" hidden style="border:1px solid #34394C;border-radius:6px;background:#171B2A;color:#AFC5FF;padding:5px 7px;font:800 8px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.06em;cursor:pointer;">' + this.copy.share + ' ↗</button>' +
            '</span>' +
          '</div>' +
          '<canvas tabindex="0" role="button" aria-label="' + this.copy.aria + '" style="display:block;width:' + W + 'px;height:' + H + 'px;cursor:pointer;touch-action:manipulation;outline:none;"></canvas>' +
        '</div>';
      this.canvas = this.querySelector('canvas');
      this.scoreEl = this.querySelector('[data-score]');
      this.exportEl = this.querySelector('[data-export]');
      this.best = readNumber('overhead-stack-best');
      this.bestCombo = readNumber('overhead-stack-combo');
      this.bestPoints = readNumber('overhead-stack-points');
      this.reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.setupCanvas();
      this.reset();

      this._drop = (event) => {
        event.preventDefault();
        this.canvas.focus({ preventScroll: true });
        this.drop();
      };
      this._key = (event) => {
        if (event.code === 'Space' || event.key === ' ' || event.key === 'Enter') this._drop(event);
      };
      this._resize = () => { this.setupCanvas(); this.render(); };
      this.canvas.addEventListener('pointerdown', this._drop);
      this.canvas.addEventListener('keydown', this._key);
      this._export = (event) => { event.preventDefault(); event.stopPropagation(); this.exportScore(); };
      this.exportEl.addEventListener('click', this._export);
      window.addEventListener('resize', this._resize);
      requestAnimationFrame(() => this.canvas && this.canvas.focus({ preventScroll: true }));

      this._tick = this.tick.bind(this);
      this._raf = requestAnimationFrame(this._tick);
      this.loadStoredLocale();
    }

    disconnectedCallback() {
      cancelAnimationFrame(this._raf);
      window.removeEventListener('resize', this._resize);
      if (this.canvas) {
        this.canvas.removeEventListener('pointerdown', this._drop);
        this.canvas.removeEventListener('keydown', this._key);
      }
      this.exportEl?.removeEventListener('click', this._export);
    }

    setupCanvas() {
      // The editor uses native browser zoom rather than bitmap scaling. Render
      // extra backing pixels as well so canvas text and one-pixel lines stay crisp.
      const renderScale = Math.max(1, +(this.getAttribute('render-scale') || 1));
      const dpr = Math.min((window.devicePixelRatio || 1) * renderScale, 4);
      this.canvas.width = Math.round(W * dpr);
      this.canvas.height = Math.round(H * dpr);
      this.ctx = this.canvas.getContext('2d');
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    loadStoredLocale() {
      try {
        if (!globalThis.chrome?.storage?.local) return;
        chrome.storage.local.get('overhead', (result) => {
          const pref = result?.overhead?.locale;
          if (pref !== 'de' && pref !== 'en') return;
          this.lang = pref;
          this.copy = COPY[pref];
          const title = this.querySelector('[data-title]');
          if (title) title.textContent = this.copy.title;
          if (this.exportEl) this.exportEl.textContent = this.copy.share + ' ↗';
          this.canvas?.setAttribute('aria-label', this.copy.aria);
          this.render();
        });
      } catch (_) { /* browser preview or restricted storage */ }
    }

    reset() {
      this.blocks = [{ x: (W - BASE_W) / 2, w: BASE_W, c: '#26272F', label: 'HTTP/2', mode: 'request' }];
      this.speed = 1.9;
      this.combo = 0;
      this.maxCombo = 0;
      this.state = 'ready';
      this.points = 0;
      this.isNewBest = false;
      this.falling = [];
      this.particles = [];
      this.feedback = null;
      this.milestone = null;
      this.shake = 0;
      this.flash = 0;
      this.freezeUntil = 0;
      this.lastTick = performance.now();
      this.spawn();
      if (this.scoreEl) this.scoreEl.textContent = '0';
      if (this.exportEl) this.exportEl.hidden = true;
      this.render();
    }

    score() { return this.blocks.length - 1; }
    modeFor(score) { return Math.floor(score / 5) % 2 === 0 ? 'request' : 'response'; }
    multiplier() { return Math.min(4, 1 + Math.floor(this.combo / 3)); }
    rank() {
      if (this.points >= 15000) return 'OVERHEAD';
      if (this.points >= 8000) return 'PROTOCOL';
      if (this.points >= 4000) return 'ROUTER';
      if (this.points >= 1500) return 'PACKET';
      return 'TRACE';
    }

    spawn() {
      const score = this.score();
      const prev = this.blocks[this.blocks.length - 1];
      const mode = this.modeFor(score);
      const widthFactor = score > 0 && score % 4 === 3 ? 0.9 : 1;
      const width = Math.max(30, prev.w * widthFactor);
      const startsRight = (score + (mode === 'response' ? 1 : 0)) % 2 === 1;
      this.moving = {
        x: startsRight ? W - width : 0,
        w: width,
        dir: startsRight ? -1 : 1,
        c: PALETTE[score % PALETTE.length],
        label: HEADERS[mode][score % HEADERS[mode].length],
        mode,
      };
    }

    camera() {
      const visible = Math.floor((H - 76) / BH);
      return Math.max(0, this.blocks.length - visible);
    }
    yOf(index) { return H - 34 - (index - this.camera()) * BH; }

    drop() {
      if (this.state === 'ready') { this.state = 'playing'; this.lastTick = performance.now(); return; }
      if (this.state === 'over') { this.reset(); this.state = 'playing'; return; }
      if (performance.now() < this.freezeUntil) return;
      const top = this.blocks[this.blocks.length - 1];
      const moving = this.moving;
      const left = Math.max(moving.x, top.x);
      const right = Math.min(moving.x + moving.w, top.x + top.w);
      let overlap = right - left;
      if (overlap <= 0) { this.gameOver(); return; }

      const error = Math.abs((moving.x + moving.w / 2) - (top.x + top.w / 2));
      const perfect = error <= 2.5;
      const clean = !perfect && error <= 7;
      let placedX = left;
      if (perfect) {
        this.combo += 1;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        const repaired = Math.min(BASE_W, overlap + Math.min(4, BASE_W - overlap));
        placedX = Math.max(0, Math.min(W - repaired, left - (repaired - overlap) / 2));
        overlap = repaired;
        this.feedback = { text: this.copy.perfect, sub: this.copy.recovered, until: performance.now() + 780 };
        this.flash = this.reduceMotion ? 0 : 1;
      } else {
        this.combo = clean ? this.combo + 1 : 0;
        if (clean) {
          this.maxCombo = Math.max(this.maxCombo, this.combo);
          this.feedback = { text: this.copy.clean, sub: '', until: performance.now() + 520 };
        }
      }

      if (!perfect && !this.reduceMotion) {
        if (moving.x < top.x) this.falling.push({ x: moving.x, w: top.x - moving.x, y: this.yOf(this.blocks.length), c: moving.c, vy: 0, vx: -1.5, a: 1 });
        else if (moving.x + moving.w > top.x + top.w) this.falling.push({ x: top.x + top.w, w: moving.x + moving.w - (top.x + top.w), y: this.yOf(this.blocks.length), c: moving.c, vy: 0, vx: 1.5, a: 1 });
      }

      this.blocks.push({ x: placedX, w: overlap, c: moving.c, label: moving.label, mode: moving.mode });
      const score = this.score();
      const gained = (100 + Math.min(10, this.combo) * 25 + (perfect ? 150 : clean ? 50 : 0)) * this.multiplier();
      this.points += gained;
      if (this.feedback) this.feedback.points = gained;
      this.burst(placedX + overlap / 2, this.yOf(this.blocks.length - 1), moving.c, perfect ? 18 : 8);
      if (this.combo === 5) this.burst(W / 2, H / 2, '#F5A623', 32);
      this.shake = this.reduceMotion ? 0 : perfect ? 1.5 : Math.min(4, Math.max(0, error - 8) * 0.12);
      this.speed = Math.min(5.6, 1.9 + score * 0.115 + Math.floor(score / 5) * 0.12);
      this.scoreEl.textContent = String(this.points).padStart(5, '0');
      if (score > this.best) { this.best = score; writeNumber('overhead-stack-best', score); }
      if (this.maxCombo > this.bestCombo) { this.bestCombo = this.maxCombo; writeNumber('overhead-stack-combo', this.maxCombo); }
      if (score % 5 === 0) {
        const now = performance.now();
        const data = MILESTONES[(score / 5 - 1) % MILESTONES.length];
        const phaseBonus = 500 + score * 20;
        this.points += phaseBonus;
        this.scoreEl.textContent = String(this.points).padStart(5, '0');
        this.milestone = { ...data, number: score / 5 + 1, next: this.modeFor(score), bonus: phaseBonus, until: now + 1300 };
        this.freezeUntil = now + 1300;
      }
      this.spawn();
    }

    gameOver() {
      this.state = 'over';
      this.shake = this.reduceMotion ? 0 : 9;
      this.burst(this.moving.x + this.moving.w / 2, this.yOf(this.blocks.length), this.moving.c, 24);
      if (this.points > this.bestPoints) {
        this.bestPoints = this.points;
        this.isNewBest = true;
        writeNumber('overhead-stack-points', this.points);
      }
      this.feedback = null;
      this.milestone = null;
      if (this.exportEl) this.exportEl.hidden = false;
    }

    async exportScore() {
      if (this.state !== 'over' || this.exporting) return;
      this.exporting = true;
      this.exportEl.disabled = true;
      const card = document.createElement('canvas');
      card.width = 1200;
      card.height = 630;
      const ctx = card.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
      gradient.addColorStop(0, '#11172B');
      gradient.addColorStop(.55, '#0C0D11');
      gradient.addColorStop(1, '#07080C');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1200, 630);
      ctx.fillStyle = 'rgba(143,180,255,.12)';
      for (let x = 40; x < 1200; x += 48) for (let y = 40; y < 630; y += 48) ctx.fillRect(x, y, 2, 2);
      ctx.fillStyle = '#4E5BF6';
      ctx.fillRect(72, 72, 10, 486);
      ctx.fillStyle = '#8FB4FF';
      ctx.font = '800 24px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText('OVERHEAD // PROTOCOL STACK', 116, 112);
      ctx.fillStyle = '#F4F5F7';
      ctx.font = '900 86px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(String(this.points).padStart(5, '0'), 110, 245);
      ctx.fillStyle = '#6F7485';
      ctx.font = '800 22px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(this.copy.points, 116, 282);
      const stats = [
        [this.copy.height.toUpperCase(), String(this.score()).padStart(2, '0')],
        [this.copy.combo, 'x' + this.maxCombo],
        [this.copy.rank, this.rank()],
      ];
      stats.forEach(([label, value], index) => {
        const x = 116 + index * 300;
        ctx.fillStyle = '#5E6373';
        ctx.font = '800 18px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(label, x, 382);
        ctx.fillStyle = index === 2 ? '#F5A623' : '#F4F5F7';
        ctx.font = '900 34px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(value, x, 430);
      });
      ctx.fillStyle = '#292D38';
      ctx.fillRect(116, 484, 970, 1);
      ctx.fillStyle = '#8B8F9C';
      ctx.font = '650 19px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText('Stack headers. Trim overhead. Beat the protocol.', 116, 530);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#4E5BF6';
      ctx.font = '850 20px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText('theconcept-technologies.com', 1086, 530);

      const dataUrl = card.toDataURL('image/png');
      const bytes = atob(dataUrl.split(',')[1]);
      const array = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) array[i] = bytes.charCodeAt(i);
      const file = new File([array], 'overhead-protocol-stack-' + this.points + '.png', { type: 'image/png' });
      // Send exactly one payload item. Supplying text alongside the image makes
      // some macOS/Chrome share targets duplicate the clipboard attachment.
      const shareData = { files: [file] };
      let sharedOrCancelled = false;
      try {
        if (navigator.share && navigator.canShare?.(shareData)) {
          await navigator.share(shareData);
          sharedOrCancelled = true;
        }
      } catch (error) {
        sharedOrCancelled = error?.name === 'AbortError';
      }
      if (!sharedOrCancelled) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = file.name;
        link.click();
        this.exportEl.textContent = this.copy.saved + ' ✓';
      }
      this.exporting = false;
      this.exportEl.disabled = false;
      setTimeout(() => { if (this.exportEl) this.exportEl.textContent = this.copy.share + ' ↗'; }, 1400);
    }

    burst(x, y, color, count) {
      if (this.reduceMotion) return;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * .35;
        const velocity = 1.2 + Math.random() * 2.8;
        this.particles.push({ x, y, c: color, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity - 1, life: 1, size: 1 + Math.random() * 2 });
      }
    }

    tick(now) {
      const dt = Math.min(2, Math.max(.25, (now - this.lastTick) / (1000 / 60)));
      this.lastTick = now;
      if (this.state === 'playing' && this.moving && now >= this.freezeUntil) {
        const m = this.moving;
        m.x += m.dir * this.speed * dt;
        if (m.x + m.w > W) { m.x = W - m.w; m.dir = -1; }
        if (m.x < 0) { m.x = 0; m.dir = 1; }
      }
      for (const falling of this.falling) {
        falling.vy += 0.6 * dt; falling.y += falling.vy * dt; falling.x += falling.vx * dt; falling.a -= 0.025 * dt;
      }
      this.falling = this.falling.filter((falling) => falling.a > 0);
      for (const p of this.particles) {
        p.vy += .08 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= .035 * dt;
      }
      this.particles = this.particles.filter((p) => p.life > 0);
      this.shake *= Math.pow(.76, dt);
      this.flash *= Math.pow(.82, dt);
      if (this.feedback && now > this.feedback.until) this.feedback = null;
      if (this.milestone && now > this.milestone.until) this.milestone = null;
      this.render();
      this._raf = requestAnimationFrame(this._tick);
    }

    roundRect(x, y, w, h, radius) {
      const safeW = Math.max(0, w);
      this.ctx.beginPath();
      this.ctx.roundRect(x, y, safeW, h, Math.min(radius, safeW / 2, h / 2));
    }

    bar(block, y, alpha) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      this.roundRect(block.x, y, block.w, BH - 6, 6);
      ctx.fillStyle = block.c;
      ctx.fill();
      if (block.label && block.w > 46) {
        ctx.clip();
        ctx.fillStyle = block.c === '#26272F' ? '#9A9DAB' : 'rgba(255,255,255,.9)';
        ctx.font = '700 9px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(block.label, block.x + 8, y + (BH - 6) / 2 + .5, Math.max(0, block.w - 16));
      }
      ctx.restore();
    }

    pill(text, x, y, color, align) {
      const ctx = this.ctx;
      ctx.font = '750 9px ui-monospace, SFMono-Regular, Menlo, monospace';
      const width = ctx.measureText(text).width + 14;
      const left = align === 'right' ? x - width : x;
      this.roundRect(left, y, width, 19, 9.5);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.fillStyle = '#F4F5F7';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, left + width / 2, y + 10);
    }

    drawArena(now, score, mode) {
      const ctx = this.ctx;
      const fever = this.combo >= 5;
      const accent = fever ? '#F5A623' : mode === 'request' ? '#6674FF' : '#30C48D';

      // Perspective grid turns the empty canvas into a protocol arena.
      const horizon = 112;
      ctx.save();
      ctx.strokeStyle = fever ? 'rgba(245,166,35,.13)' : mode === 'request' ? 'rgba(102,116,255,.075)' : 'rgba(48,196,141,.07)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 7; i++) {
        const t = i / 6;
        const y = horizon + t * t * (H - horizon - 8);
        ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(W - 10, y); ctx.stroke();
      }
      for (let i = -4; i <= 4; i++) {
        ctx.beginPath(); ctx.moveTo(W / 2 + i * 12, horizon); ctx.lineTo(W / 2 + i * 42, H); ctx.stroke();
      }

      // Packet rails animate in opposite directions at the arena edges.
      const travel = ((now / 14) % 270);
      for (const side of [8, W - 8]) {
        ctx.strokeStyle = 'rgba(143,180,255,.12)';
        ctx.beginPath(); ctx.moveTo(side, 48); ctx.lineTo(side, H - 16); ctx.stroke();
        for (let i = 0; i < 3; i++) {
          const y = 48 + ((travel + i * 91 + (side < W / 2 ? 0 : 135)) % 286);
          ctx.fillStyle = accent;
          ctx.globalAlpha = .22 + i * .08;
          ctx.fillRect(side - 1, y, 3, 10);
        }
      }
      ctx.globalAlpha = 1;

      // Five packet slots communicate progress to the next protocol phase.
      const progress = score % 5;
      for (let i = 0; i < 5; i++) {
        this.roundRect(116 + i * 14, 34, 10, 3, 1.5);
        ctx.fillStyle = i < progress ? accent : 'rgba(255,255,255,.09)';
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,.22)';
      ctx.font = '750 7px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('LEVEL ' + String(Math.floor(score / 5) + 1).padStart(2, '0'), W / 2, 45);
      ctx.restore();
    }

    render() {
      if (!this.ctx) return;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, W, H);
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#111522');
      bg.addColorStop(.48, '#0C0D11');
      bg.addColorStop(1, '#090A0E');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      if (this.shake > .1) ctx.translate((Math.random() - .5) * this.shake, (Math.random() - .5) * this.shake);
      ctx.fillStyle = 'rgba(255,255,255,.028)';
      for (let gx = 12; gx < W; gx += 24) for (let gy = 12; gy < H; gy += 24) ctx.fillRect(gx, gy, 1, 1);

      const score = this.score();
      const mode = this.modeFor(score);
      const fever = this.combo >= 5;
      this.drawArena(performance.now(), score, mode);
      this.pill(this.copy[mode], 12, 11, mode === 'request' ? '#27315E' : '#174A3A');
      ctx.font = '650 9px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'right';
      ctx.fillStyle = fever ? '#F5A623' : '#6B6E7A';
      ctx.fillText((fever ? this.copy.fever : this.copy.points + ' ' + String(this.points).padStart(5, '0')) + '  ·  ×' + this.multiplier(), W - 13, 24);

      const cam = this.camera();
      const towerTop = this.blocks[this.blocks.length - 1];
      const towerGlow = ctx.createRadialGradient(towerTop.x + towerTop.w / 2, this.yOf(this.blocks.length - 1), 4, towerTop.x + towerTop.w / 2, this.yOf(this.blocks.length - 1), 105);
      towerGlow.addColorStop(0, mode === 'request' ? 'rgba(78,91,246,.18)' : 'rgba(48,164,108,.16)');
      towerGlow.addColorStop(1, 'rgba(12,13,17,0)');
      ctx.fillStyle = towerGlow;
      ctx.fillRect(25, Math.max(65, this.yOf(this.blocks.length - 1) - 90), W - 50, 170);
      for (let i = 0; i < this.blocks.length; i++) {
        if (i >= cam - 1) this.bar(this.blocks[i], this.yOf(i));
      }
      for (const falling of this.falling) this.bar(falling, falling.y, Math.max(0, falling.a));
      if (this.state === 'playing' && this.moving) {
        const top = this.blocks[this.blocks.length - 1];
        const ghostLeft = Math.max(this.moving.x, top.x);
        const ghostRight = Math.min(this.moving.x + this.moving.w, top.x + top.w);
        if (ghostRight > ghostLeft) {
          ctx.fillStyle = 'rgba(143,180,255,.12)';
          ctx.fillRect(ghostLeft, this.yOf(this.blocks.length) + BH - 3, ghostRight - ghostLeft, 2);
        }
        if (!this.reduceMotion) {
          for (let i = 3; i >= 1; i--) {
            const trail = { ...this.moving, x: this.moving.x - this.moving.dir * i * 5 };
            this.bar(trail, this.yOf(this.blocks.length), .045 * (4 - i));
          }
        }
        this.bar(this.moving, this.yOf(this.blocks.length));
      }
      for (const p of this.particles) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      if (fever && this.state === 'playing') {
        const feverAlpha = this.reduceMotion ? .5 : .38 + Math.sin(performance.now() / 120) * .12;
        ctx.strokeStyle = 'rgba(245,166,35,' + feverAlpha + ')';
        ctx.lineWidth = 2;
        ctx.strokeRect(3, 3, W - 6, H - 6);
        ctx.fillStyle = 'rgba(245,166,35,.07)';
        for (let y = 6; y < H; y += 8) ctx.fillRect(3, y, W - 6, 1);
      }

      if (score === 0 && this.state === 'playing') {
        this.roundRect(65, 50, 170, 27, 8);
        ctx.fillStyle = 'rgba(15,18,29,.86)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(143,180,255,.18)';
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#A9BCEB';
        ctx.font = '750 9px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(this.copy.intro.toUpperCase(), W / 2, 67);
      }

      if (this.feedback) {
        const accent = this.feedback.text === this.copy.perfect ? '#8FB4FF' : '#30A46C';
        const bannerW = this.feedback.sub ? 190 : 152;
        this.roundRect((W - bannerW) / 2, 42, bannerW, this.feedback.sub ? 42 : 30, 10);
        ctx.fillStyle = 'rgba(17,21,34,.94)';
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.fillStyle = accent;
        ctx.font = '900 12px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(this.feedback.text + '  ×' + Math.max(1, this.combo) + '  +' + (this.feedback.points || 0), W / 2, 60);
        if (this.feedback.sub) {
          ctx.fillStyle = '#AEB1BE';
          ctx.font = '650 8px ui-monospace, SFMono-Regular, Menlo, monospace';
          ctx.fillText(this.feedback.sub.toUpperCase(), W / 2, 76);
        }
      }

      if (this.milestone) {
        const cardX = 31, cardY = 91, cardW = W - 62, cardH = 126;
        const cardGradient = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
        cardGradient.addColorStop(0, 'rgba(24,29,48,.98)');
        cardGradient.addColorStop(1, 'rgba(10,12,19,.98)');
        ctx.shadowColor = 'rgba(78,91,246,.38)';
        ctx.shadowBlur = 24;
        this.roundRect(cardX, cardY, cardW, cardH, 15);
        ctx.fillStyle = cardGradient;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(143,180,255,.45)';
        ctx.lineWidth = 1;
        ctx.stroke();
        this.roundRect(cardX, cardY, 4, cardH, 2);
        ctx.fillStyle = this.milestone.next === 'request' ? '#4E5BF6' : '#30A46C';
        ctx.fill();
        ctx.textAlign = 'left';
        ctx.fillStyle = '#737789';
        ctx.font = '800 8px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(this.copy.phase + ' ' + String(this.milestone.number).padStart(2, '0') + '  //  ' + this.copy[this.milestone.next], cardX + 18, cardY + 22);
        ctx.fillStyle = '#8FB4FF';
        ctx.font = '900 18px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(this.milestone.code, cardX + 18, cardY + 50);
        ctx.fillStyle = '#F4F5F7';
        ctx.font = '750 9px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(this.milestone.label, cardX + 18, cardY + 69);
        ctx.fillStyle = '#656979';
        ctx.fillRect(cardX + 18, cardY + 81, cardW - 36, 1);
        ctx.fillStyle = '#AEB1BE';
        ctx.font = '700 8px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(this.copy.route + '  ' + this.copy[this.milestone.next], cardX + 18, cardY + 103);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#F5A623';
        ctx.fillText('+' + this.milestone.bonus + '  ' + this.copy.bonus, cardX + cardW - 16, cardY + 103);
        ctx.textAlign = 'left';
        for (let i = 0; i < 5; i++) {
          this.roundRect(cardX + 18 + i * 13, cardY + 113, 9, 3, 1.5);
          ctx.fillStyle = i < 5 ? (this.milestone.next === 'request' ? '#4E5BF6' : '#30A46C') : '#292C36';
          ctx.fill();
        }
      }

      if (this.state === 'ready') {
        ctx.fillStyle = 'rgba(7,8,12,.72)';
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#8FB4FF';
        ctx.font = '850 10px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText('HTTP/2  ·  LOCAL SESSION', W / 2, 106);
        ctx.fillStyle = '#F4F5F7';
        ctx.font = '900 27px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText('PROTOCOL', W / 2, 144);
        ctx.fillText('STACK', W / 2, 174);
        ctx.fillStyle = '#8B8E9C';
        ctx.font = '500 11px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText(this.copy.startHint, W / 2, 204);
        const pulse = this.reduceMotion ? .9 : .78 + Math.sin(performance.now() / 260) * .12;
        ctx.globalAlpha = pulse;
        this.roundRect(73, 237, 154, 38, 10);
        ctx.fillStyle = '#4E5BF6';
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '850 11px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(this.copy.start + '  ▶', W / 2, 261);
        ctx.fillStyle = '#686B78';
        ctx.font = '650 9px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(this.copy.best + ' ' + String(this.bestPoints).padStart(5, '0') + '  ·  ' + this.copy.max + ' x' + this.bestCombo, W / 2, 304);
      }

      if (this.state === 'over') {
        ctx.fillStyle = 'rgba(12,13,17,.88)';
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#E5484D';
        ctx.font = '850 17px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(this.copy.toppled, W / 2, H / 2 - 25);
        ctx.fillStyle = '#F4F5F7';
        ctx.font = '750 13px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText(this.copy.points + ' ' + String(this.points).padStart(5, '0') + '  ·  ' + this.copy.height + ' ' + score, W / 2, H / 2 + 8);
        ctx.fillStyle = '#F5A623';
        ctx.font = '900 11px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(this.copy.rank + '  //  ' + this.rank(), W / 2, H / 2 + 31);
        if (this.isNewBest) {
          ctx.fillStyle = '#8FB4FF';
          ctx.font = '850 10px ui-monospace, SFMono-Regular, Menlo, monospace';
          ctx.fillText(this.copy.newBest, W / 2, H / 2 + 49);
        }
        ctx.fillStyle = '#8FB4FF';
        ctx.font = '550 11px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText(this.copy.retry, W / 2, H / 2 + 72);
      }
      if (this.flash > .02) {
        ctx.fillStyle = 'rgba(143,180,255,' + (.12 * this.flash) + ')';
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
    }
  }

  if (!customElements.get('overhead-stack')) customElements.define('overhead-stack', OverheadStack);
})();
