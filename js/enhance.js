/* ============================================================
   PORTFOLIO — js/enhance.js
   Custom magnetic cursor + ⌘K command palette. Both are pure
   progressive enhancement: if this file fails to load, nothing
   else on the site depends on it.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const REDUCE_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const FINE_POINTER = !!(window.matchMedia &&
    window.matchMedia('(pointer: fine)').matches &&
    !window.matchMedia('(hover: none)').matches);

  const inProjectDir = /\/projects\//.test(location.pathname);
  const root = inProjectDir ? '../' : '';

  /* ----------------------------------------------------------
     1. CUSTOM CURSOR — "Stardust"
        - core dot tracks the pointer exactly
        - ring follows on a critically-damped spring and stretches
          along its direction of travel
        - over controls the ring morphs to wrap the element (with a
          slight magnetic pull); over cards / the map it becomes a
          labelled disc; over inputs it collapses into a caret
        - fast movement sheds tiny gold stardust; clicks send a shockwave
        - touch / coarse pointers never see any of this
  ---------------------------------------------------------- */
  (function initCursor() {
    if (!FINE_POINTER) return;

    const root = document.documentElement;
    const cursor = document.createElement('div');
    cursor.className = 'cursor';
    cursor.innerHTML =
      '<div class="cursor__ring"><div class="cursor__shape"><span class="cursor__label"></span></div></div>' +
      '<div class="cursor__dot"></div>';
    const ring = cursor.querySelector('.cursor__ring');
    const shape = cursor.querySelector('.cursor__shape');
    const label = cursor.querySelector('.cursor__label');
    const dot = cursor.querySelector('.cursor__dot');

    let canvas = null, ctx = null, dpr = 1, W = 0, H = 0;
    if (!REDUCE_MOTION) {
      canvas = document.createElement('canvas');
      canvas.className = 'cursor-trail';
      canvas.setAttribute('aria-hidden', 'true');
      ctx = canvas.getContext('2d');
      document.body.appendChild(canvas);
      const resize = () => {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth; H = window.innerHeight;
        canvas.width = W * dpr; canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();
      window.addEventListener('resize', resize);
    }
    document.body.appendChild(cursor);
    root.classList.add('has-custom-cursor');

    /* ---- state ---- */
    let mx = -200, my = -200;          // pointer
    let rx = -200, ry = -200;          // ring
    let stretch = 0, angle = 0;        // eased deformation
    let visible = false;
    let state = 'idle';
    let target = null;                 // element the ring is wrapping
    let shapeW = 0, shapeH = 0, shapeR = '';
    let last = 0, raf = 0, lastMoveT = 0;
    const particles = [];
    let palette = { accent: '#ffc300', alt: '#ffd60a', light: false };

    function readPalette() {
      const cs = getComputedStyle(root);
      palette.accent = cs.getPropertyValue('--accent-primary').trim() || palette.accent;
      palette.alt = cs.getPropertyValue('--accent-secondary').trim() || palette.alt;
      palette.light = root.getAttribute('data-theme') === 'light';
    }
    readPalette();
    new MutationObserver(readPalette).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    /* ---- context resolution ---- */
    const TEXT_SEL = 'input, textarea, [contenteditable="true"]';
    const MAGNET_SEL = 'a, button, [role="button"], summary, .cmdk-item';
    function resolve(el) {
      if (!el || !el.closest) return { s: 'idle' };
      if (el.closest('[data-cursor="off"]')) return { s: 'idle' };
      if (el.closest(TEXT_SEL)) return { s: 'text' };
      const lab = el.closest('[data-cursor-label]');
      if (lab) return { s: 'label', text: lab.getAttribute('data-cursor-label') };
      const card = el.closest('.project-card');
      if (card) return { s: 'label', text: 'View' };
      if (el.closest('.map-container')) return { s: 'label', text: 'Drag' };
      const m = el.closest(MAGNET_SEL);
      if (m) {
        const r = m.getBoundingClientRect();
        if (r.width > 380 || r.height > 160) return { s: 'grow' };
        return { s: 'magnet', el: m };
      }
      if (el.closest('.terminal__body')) return { s: 'text' };
      return { s: 'idle' };
    }

    function setState(next) {
      if (next.s !== state) {
        state = next.s;
        cursor.setAttribute('data-state', state);
        if (state !== 'magnet') { shapeW = shapeH = 0; shapeR = ''; shape.style.width = shape.style.height = shape.style.margin = shape.style.borderRadius = ''; }
      }
      if (state === 'label' && label.textContent !== next.text) label.textContent = next.text;
      target = state === 'magnet' ? next.el : null;
    }

    function refreshContext() {
      const el = document.elementFromPoint(mx, my);
      setState(resolve(el));
    }

    /* ---- events ---- */
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') { hide(); return; }
      mx = e.clientX; my = e.clientY;
      lastMoveT = performance.now();
      if (!visible) {
        visible = true; rx = mx; ry = my;
        cursor.classList.add('cursor--ready');
        cursor.classList.remove('cursor--hidden');
      }
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
      start();
    }, { passive: true });

    document.addEventListener('pointerover', (e) => setState(resolve(e.target)), { passive: true });
    window.addEventListener('scroll', () => { if (visible) requestAnimationFrame(refreshContext); }, { passive: true });

    function hide() { visible = false; cursor.classList.remove('cursor--ready'); cursor.classList.add('cursor--hidden'); }
    document.documentElement.addEventListener('mouseleave', hide);
    window.addEventListener('blur', hide);

    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      cursor.classList.add('cursor--down');
      shockwave(e.clientX, e.clientY);
      if (!REDUCE_MOTION) burst(e.clientX, e.clientY);
    });
    window.addEventListener('pointerup', () => cursor.classList.remove('cursor--down'));

    function shockwave(x, y) {
      const p = document.createElement('div');
      p.className = 'cursor-pulse';
      p.style.setProperty('--px', x + 'px');
      p.style.setProperty('--py', y + 'px');
      document.body.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
    }

    /* ---- stardust ---- */
    function emit(x, y, vx, vy, n) {
      for (let i = 0; i < n && particles.length < 90; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = Math.random() * 0.35;
        particles.push({
          x: x + (Math.random() - 0.5) * 6,
          y: y + (Math.random() - 0.5) * 6,
          vx: -vx * 0.04 + Math.cos(a) * sp,
          vy: -vy * 0.04 + Math.sin(a) * sp,
          r: 1 + Math.random() * 1.9,
          life: 0, max: 700 + Math.random() * 700,
          alt: Math.random() < 0.3,
        });
      }
    }
    function burst(x, y) {
      for (let i = 0; i < 12 && particles.length < 90; i++) {
        const a = (i / 12) * Math.PI * 2 + Math.random() * 0.4;
        const sp = 0.08 + Math.random() * 0.18;
        particles.push({ x, y, vx: Math.cos(a) * sp * 6, vy: Math.sin(a) * sp * 6,
          r: 0.8 + Math.random() * 1.6, life: 0, max: 500 + Math.random() * 400, alt: i % 3 === 0 });
      }
      start();
    }

    /* ---- loop ---- */
    function start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }

    function frame(now) {
      const dt = Math.min(now - last, 50); last = now;

      // where the ring wants to be
      let tx = mx, ty = my;
      if (state === 'magnet' && target && target.isConnected) {
        const r = target.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        tx = cx + (mx - cx) * 0.22;              // magnetic pull toward the pointer
        ty = cy + (my - cy) * 0.22;
        const w = Math.round(r.width + 16), h = Math.round(r.height + 12);
        if (w !== shapeW || h !== shapeH) {
          shapeW = w; shapeH = h;
          shape.style.width = w + 'px'; shape.style.height = h + 'px';
          shape.style.margin = (-h / 2) + 'px 0 0 ' + (-w / 2) + 'px';
        }
        if (!shapeR) {
          const br = parseFloat(getComputedStyle(target).borderTopLeftRadius) || 0;
          shapeR = Math.min(br + 6, h / 2) + 'px';
          shape.style.borderRadius = shapeR;
        }
      }

      // ring spring (frame-rate independent exponential smoothing)
      const follow = REDUCE_MOTION ? 1 : 1 - Math.exp(-dt / (state === 'magnet' ? 90 : 62));
      const ox = tx - rx, oy = ty - ry;
      rx += ox * follow; ry += oy * follow;

      // stretch along travel direction (only in the free-roaming states)
      const free = state === 'idle' || state === 'grow';
      const speed = Math.hypot(ox, oy);
      const want = free && !REDUCE_MOTION ? Math.min(speed / 90, 1) : 0;
      stretch += (want - stretch) * (1 - Math.exp(-dt / 70));
      if (speed > 2) angle = Math.atan2(oy, ox);
      const sx = free ? 1 + stretch * 0.55 : 1, sy = free ? 1 - stretch * 0.32 : 1;
      const rot = free ? angle : 0;   // rectangles / discs / caret never rotate
      ring.style.transform = 'translate3d(' + rx.toFixed(2) + 'px,' + ry.toFixed(2) + 'px,0) rotate(' + rot.toFixed(3) + 'rad) scale(' + sx.toFixed(3) + ',' + sy.toFixed(3) + ')';

      // stardust: shed while moving fast in free states
      if (ctx) {
        const pv = Math.hypot(mx - rx, my - ry);
        if (visible && free && pv > 10) emit(mx, my, mx - rx, my - ry, pv > 60 ? 3 : 2);

        ctx.clearRect(0, 0, W, H);
        ctx.globalCompositeOperation = palette.light ? 'source-over' : 'lighter';
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.life += dt;
          if (p.life >= p.max) { particles.splice(i, 1); continue; }
          const k = 1 - p.life / p.max;
          p.vx *= 0.985; p.vy *= 0.985; p.vy += 0.0006 * dt;
          p.x += p.vx * dt * 0.06 * 16; p.y += p.vy * dt * 0.06 * 16;
          const rr = p.r * (0.4 + k * 0.6);
          ctx.fillStyle = p.alt ? palette.alt : palette.accent;
          ctx.globalAlpha = k * 0.16;                       // soft halo
          ctx.beginPath(); ctx.arc(p.x, p.y, rr * 3.2, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = Math.min(1, k * 1.3);            // bright core
          ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      const settled = Math.abs(ox) < 0.1 && Math.abs(oy) < 0.1 && stretch < 0.01 && !particles.length;
      if (settled && now - lastMoveT > 200 && state !== 'magnet') { raf = 0; return; }
      raf = requestAnimationFrame(frame);
    }
  })();

  /* ----------------------------------------------------------
     2. COMMAND PALETTE — Ctrl/Cmd+K quick jump
  ---------------------------------------------------------- */
  (function initCommandPalette() {
    const trigger = document.getElementById('cmdk-trigger');

    function downloadResume() {
      const a = document.createElement('a');
      a.href = root + 'data/Priyanshu_Pratik_Resume.pdf';
      a.download = 'Priyanshu_Resume.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    const items = [
      { label: 'About', hint: 'Section', keywords: 'about background focus education', action: () => go(root + 'index.html#about') },
      { label: 'Projects', hint: 'Section', keywords: 'projects grid showcase work', action: () => go(root + 'index.html#projects') },
      { label: 'Contact / Terminal', hint: 'Section', keywords: 'contact terminal cli email', action: () => go(root + 'index.html#contact') },
      { label: 'Vector Squadron', hint: 'Project', keywords: 'rust wasm three.js space flight sim game', action: () => go(root + 'projects/vector-squadron.html') },
      { label: 'AeroTwin', hint: 'Project', keywords: 'digital twin airport atc simulation', action: () => go(root + 'projects/aerotwin.html') },
      { label: 'DamageLens', hint: 'Project', keywords: 'deep learning satellite disaster', action: () => go(root + 'projects/damagelens.html') },
      { label: 'Waveglider Ocean Simulation', hint: 'Project', keywords: 'webgl gerstner waves ocean', action: () => go(root + 'projects/waveglider.html') },
      { label: 'Beyond the Apex', hint: 'Project', keywords: 'f1 telemetry fastf1 d3', action: () => go(root + 'projects/beyond-the-apex.html') },
      { label: 'Agentic Supply Chain', hint: 'Project', keywords: 'langgraph multi-agent supply chain', action: () => go(root + 'projects/agentic-supply.html') },
      { label: 'LocalPDF Pro', hint: 'Project', keywords: 'wasm pdf privacy offline', action: () => go(root + 'projects/localpdf-pro.html') },
      { label: 'Aura', hint: 'Project', keywords: 'android kotlin fft audio fingerprint', action: () => go(root + 'projects/aura.html') },
      { label: 'PulmoSense', hint: 'Project', keywords: 'pytorch tflite medical grad-cam', action: () => go(root + 'projects/pulmosense.html') },
      { label: 'Retro Arcade Suite', hint: 'Project', keywords: 'python pygame tkinter games', action: () => go(root + 'projects/retro-arcade.html') },
      { label: 'Download Resume', hint: 'Action', keywords: 'cv pdf download resume', action: downloadResume },
      { label: 'Toggle Theme', hint: 'Action', keywords: 'dark light theme mode', action: () => document.getElementById('theme-toggle') && document.getElementById('theme-toggle').click() },
      { label: 'Email Priyanshu', hint: 'Contact', keywords: 'email mail gmail', action: () => window.location.href = 'mailto:priyanshupratik07@gmail.com' },
      { label: 'GitHub', hint: 'Contact', keywords: 'github code source', action: () => window.open('https://github.com/ppratik765', '_blank', 'noopener') },
      { label: 'LinkedIn', hint: 'Contact', keywords: 'linkedin professional', action: () => window.open('https://www.linkedin.com/in/priyanshu-pratik-ai', '_blank', 'noopener') },
    ];

    function go(href) {
      window.location.href = href;
    }

    let overlay, input, list, activeIndex = 0, filtered = items.slice();

    function build() {
      overlay = document.createElement('div');
      overlay.className = 'cmdk-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.innerHTML = `
        <div class="cmdk-panel">
          <div class="cmdk-input-row">
            <span class="cmdk-prompt">/</span>
            <input type="text" class="cmdk-input" placeholder="Jump to a project or section…" autocomplete="off" spellcheck="false" />
            <kbd class="cmdk-esc">Esc</kbd>
          </div>
          <ul class="cmdk-list"></ul>
        </div>`;
      document.body.appendChild(overlay);
      input = overlay.querySelector('.cmdk-input');
      list = overlay.querySelector('.cmdk-list');

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });
      input.addEventListener('input', () => render(input.value));
      input.addEventListener('keydown', onKeydown);
    }

    function render(query) {
      const q = (query || '').trim().toLowerCase();
      filtered = !q ? items.slice() : items.filter((it) =>
        it.label.toLowerCase().includes(q) || it.keywords.includes(q)
      );
      activeIndex = 0;
      list.innerHTML = filtered.length
        ? filtered.map((it, i) => `
          <li class="cmdk-item${i === 0 ? ' cmdk-item--active' : ''}" data-index="${i}">
            <span class="cmdk-item__label">${it.label}</span>
            <span class="cmdk-item__hint">${it.hint}</span>
          </li>`).join('')
        : '<li class="cmdk-empty">No matches. Try “resume”, “github”, or a project name.</li>';

      list.querySelectorAll('.cmdk-item').forEach((el) => {
        el.addEventListener('mouseenter', () => setActive(parseInt(el.dataset.index, 10)));
        el.addEventListener('click', () => activate(parseInt(el.dataset.index, 10)));
      });
    }

    function setActive(i) {
      activeIndex = i;
      list.querySelectorAll('.cmdk-item').forEach((el, idx) => {
        el.classList.toggle('cmdk-item--active', idx === i);
      });
      const activeEl = list.children[i];
      if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
    }

    function activate(i) {
      const item = filtered[i];
      if (!item) return;
      close();
      item.action();
    }

    function onKeydown(e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (filtered.length) setActive((activeIndex + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (filtered.length) setActive((activeIndex - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        activate(activeIndex);
      }
    }

    function open() {
      if (!overlay) build();
      render('');
      overlay.classList.add('cmdk-overlay--open');
      document.body.classList.add('cmdk-locked');
      setTimeout(() => input.focus(), 10);
    }

    function close() {
      if (!overlay) return;
      overlay.classList.remove('cmdk-overlay--open');
      document.body.classList.remove('cmdk-locked');
      input.value = '';
    }

    document.addEventListener('keydown', (e) => {
      const metaK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (metaK) {
        e.preventDefault();
        overlay && overlay.classList.contains('cmdk-overlay--open') ? close() : open();
      }
    });

    if (trigger) trigger.addEventListener('click', open);
  })();

});
