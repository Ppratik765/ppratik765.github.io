/* ============================================================
   PORTFOLIO — main.js
   Complete interactive engine: Three.js, GSAP, custom cursor,
   pathfinding, project card effects, terminal, theme toggle,
   efficiency mode, FPS counter.
   ============================================================ */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     0. GLOBALS & STATE
  ---------------------------------------------------------- */
  const STATE = {
    theme: 'dark',
    efficiencyMode: false,
    mouse: { x: 0, y: 0, speed: 0 },
    animationFrames: [],
    renderers: [],
  };

  // Utility: register an animation frame so we can kill them in efficiency mode
  function registerLoop(fn) {
    let running = true;
    function loop(t) {
      if (!running) return;
      fn(t);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    const handle = { stop() { running = false; }, start() { if (!running) { running = true; requestAnimationFrame(loop); } } };
    STATE.animationFrames.push(handle);
    return handle;
  }

  /* ----------------------------------------------------------
     1. FPS COUNTER
  ---------------------------------------------------------- */
  const fpsEl = document.getElementById('fps-counter');
  let fpsFrames = 0, fpsLast = performance.now();
  function updateFPS() {
    fpsFrames++;
    const now = performance.now();
    if (now - fpsLast >= 500) {
      const fps = Math.round((fpsFrames * 1000) / (now - fpsLast));
      fpsEl.textContent = fps + ' FPS';
      fpsFrames = 0;
      fpsLast = now;
    }
    requestAnimationFrame(updateFPS);
  }
  requestAnimationFrame(updateFPS);

  /* ----------------------------------------------------------
     2. CUSTOM CURSOR (Canvas trail with speed-based styling)
  ---------------------------------------------------------- */
  (function initCursor() {
    const canvas = document.getElementById('cursor-canvas');
    const ctx = canvas.getContext('2d');
    const trail = [];
    const TRAIL_LENGTH = 28;
    let prevX = 0, prevY = 0, speedSmooth = 0;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    window.addEventListener('mousemove', (e) => {
      STATE.mouse.x = e.clientX;
      STATE.mouse.y = e.clientY;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      STATE.mouse.speed = Math.sqrt(dx * dx + dy * dy);
      prevX = e.clientX;
      prevY = e.clientY;
    });

    registerLoop(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      speedSmooth += (STATE.mouse.speed - speedSmooth) * 0.15;
      const norm = Math.min(speedSmooth / 40, 1); // 0 = slow, 1 = fast

      trail.unshift({ x: STATE.mouse.x, y: STATE.mouse.y });
      if (trail.length > TRAIL_LENGTH) trail.pop();

      // Determine colors from CSS custom properties
      const style = getComputedStyle(document.documentElement);
      const slowColor = style.getPropertyValue('--cursor-slow').trim() || '#d4a373';
      const fastColor = style.getPropertyValue('--cursor-fast').trim() || '#ffc300';

      // Draw trail
      if (trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) {
          const t = i / trail.length;
          ctx.lineTo(trail[i].x, trail[i].y);
        }
        ctx.strokeStyle = norm > 0.4 ? fastColor : slowColor;
        ctx.lineWidth = 2 + norm * 4;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.6;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Draw cursor dot
      const dotRadius = 5 + norm * 6;
      ctx.beginPath();
      ctx.arc(STATE.mouse.x, STATE.mouse.y, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = norm > 0.4 ? fastColor : slowColor;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Spiky ring when moving fast
      if (norm > 0.3) {
        const spikes = 8;
        const outerR = dotRadius + 6 + norm * 10;
        const innerR = dotRadius + 2;
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
          const angle = (i * Math.PI) / spikes - Math.PI / 2;
          const r = i % 2 === 0 ? outerR : innerR;
          const sx = STATE.mouse.x + Math.cos(angle) * r;
          const sy = STATE.mouse.y + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.strokeStyle = fastColor;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = norm * 0.6;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });
  })();

  /* ----------------------------------------------------------
     3. THEME TOGGLE
  ---------------------------------------------------------- */
  (function initTheme() {
    const btn = document.getElementById('theme-toggle');
    const icon = document.getElementById('theme-icon');
    const label = document.getElementById('theme-label');

    btn.addEventListener('click', () => {
      const html = document.documentElement;
      const next = STATE.theme === 'dark' ? 'light' : 'dark';

      // GSAP flash transition
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position:fixed;top:0;left:0;width:100vw;height:100vh;
        z-index:9999;pointer-events:none;
        background:${next === 'light' ? '#fefae0' : '#000814'};
      `;
      document.body.appendChild(overlay);
      gsap.fromTo(overlay, { opacity: 0 }, {
        opacity: 0.6, duration: 0.25, ease: 'power2.in',
        onComplete() {
          html.setAttribute('data-theme', next);
          STATE.theme = next;
          icon.textContent = next === 'dark' ? '☾' : '☀';
          label.textContent = next === 'dark' ? 'Light' : 'Dark';
          gsap.to(overlay, {
            opacity: 0, duration: 0.45, ease: 'power2.out',
            onComplete() { overlay.remove(); }
          });
        }
      });
    });
  })();

  /* ----------------------------------------------------------
     4. HERO — Three.js Wireframe Grid + Autonomous Ship
  ---------------------------------------------------------- */
  (function initHero() {
    const canvas = document.getElementById('hero-canvas');
    const section = document.getElementById('hero');
    if (!canvas || typeof THREE === 'undefined') return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, section.clientWidth / section.clientHeight, 0.1, 1000);
    camera.position.set(0, 8, 18);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(section.clientWidth, section.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    STATE.renderers.push(renderer);

    // Wireframe grid
    const gridSize = 40;
    const divisions = 30;
    const gridGeo = new THREE.PlaneGeometry(gridSize, gridSize, divisions, divisions);
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0xffc300,
      wireframe: true,
      transparent: true,
      opacity: 0.12
    });
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = -2;
    scene.add(grid);

    // Second deeper grid for depth
    const grid2Geo = new THREE.PlaneGeometry(gridSize * 2, gridSize * 2, divisions * 2, divisions * 2);
    const grid2Mat = new THREE.MeshBasicMaterial({
      color: 0x003566,
      wireframe: true,
      transparent: true,
      opacity: 0.06
    });
    const grid2 = new THREE.Mesh(grid2Geo, grid2Mat);
    grid2.rotation.x = -Math.PI / 2;
    grid2.position.y = -4;
    scene.add(grid2);

    // Autonomous ship — wireframe tetrahedron
    const shipGeo = new THREE.ConeGeometry(0.4, 1.2, 4);
    const shipMat = new THREE.MeshBasicMaterial({
      color: 0xffc300,
      wireframe: true,
      transparent: true,
      opacity: 0.85
    });
    const ship = new THREE.Mesh(shipGeo, shipMat);
    ship.rotation.x = Math.PI / 2;
    scene.add(ship);

    // Ship trail particles
    const trailCount = 60;
    const trailGeo = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(trailCount * 3);
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.PointsMaterial({
      color: 0xffd60a,
      size: 0.08,
      transparent: true,
      opacity: 0.5
    });
    const trailPoints = new THREE.Points(trailGeo, trailMat);
    scene.add(trailPoints);

    // Background stars
    const starCount = 300;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 80;
      starPos[i * 3 + 1] = Math.random() * 30 + 2;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffd60a,
      size: 0.12,
      transparent: true,
      opacity: 0.4
    });
    scene.add(new THREE.Points(starGeo, starMat));

    // Ship autopilot variables
    let shipAngle = 0;
    const shipRadius = 6;
    let mouseInfluence = { x: 0, y: 0 };

    // Mouse parallax
    section.addEventListener('mousemove', (e) => {
      const rect = section.getBoundingClientRect();
      mouseInfluence.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseInfluence.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    });

    // Animation loop
    const trailHistory = [];
    registerLoop((t) => {
      if (STATE.efficiencyMode) return;
      const time = t * 0.001;

      // Animate grid wave
      const positions = gridGeo.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 1];
        positions[i + 2] = Math.sin(x * 0.4 + time * 0.8) * 0.3 + Math.cos(z * 0.3 + time * 0.6) * 0.25;
      }
      gridGeo.attributes.position.needsUpdate = true;

      // Ship autopilot — figure-8 pattern
      shipAngle += 0.008;
      const sx = Math.sin(shipAngle) * shipRadius;
      const sz = Math.sin(shipAngle * 2) * (shipRadius * 0.5);
      const sy = Math.sin(time * 1.5) * 0.5 + 1.5;
      ship.position.set(sx, sy, sz);

      // Ship orientation (point along path)
      const nextAngle = shipAngle + 0.01;
      const nx = Math.sin(nextAngle) * shipRadius;
      const nz = Math.sin(nextAngle * 2) * (shipRadius * 0.5);
      ship.lookAt(nx, sy, nz);
      ship.rotateX(Math.PI / 2);

      // Ship trail
      trailHistory.unshift({ x: sx, y: sy, z: sz });
      if (trailHistory.length > trailCount) trailHistory.pop();
      for (let i = 0; i < trailCount; i++) {
        if (i < trailHistory.length) {
          trailPositions[i * 3] = trailHistory[i].x;
          trailPositions[i * 3 + 1] = trailHistory[i].y - 0.2;
          trailPositions[i * 3 + 2] = trailHistory[i].z;
        }
      }
      trailGeo.attributes.position.needsUpdate = true;

      // Camera parallax
      const targetCamX = mouseInfluence.x * 3;
      const targetCamY = 8 + mouseInfluence.y * -2;
      camera.position.x += (targetCamX - camera.position.x) * 0.03;
      camera.position.y += (targetCamY - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);

      // Update theme-dependent colors
      const isDark = STATE.theme === 'dark';
      gridMat.color.setHex(isDark ? 0xffc300 : 0xcc9a06);
      grid2Mat.color.setHex(isDark ? 0x003566 : 0xe2ddd2);
      shipMat.color.setHex(isDark ? 0xffc300 : 0xb8860b);
      trailMat.color.setHex(isDark ? 0xffd60a : 0xcc9a06);
      starMat.color.setHex(isDark ? 0xffd60a : 0xb8860b);
      renderer.setClearColor(0x000000, 0);

      renderer.render(scene, camera);
    });

    window.addEventListener('resize', () => {
      camera.aspect = section.clientWidth / section.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(section.clientWidth, section.clientHeight);
    });
  })();

  /* ----------------------------------------------------------
     5. ABOUT — A* Pathfinding Visualizer
  ---------------------------------------------------------- */
  (function initPathfinding() {
    const canvas = document.getElementById('pathfinding-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    resizeCanvas();

    const COLS = 22;
    const ROWS = 16;
    const cellW = () => canvas.clientWidth / COLS;
    const cellH = () => canvas.clientHeight / ROWS;

    // Grid: 0 = open, 1 = wall
    const grid = [];
    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        grid[r][c] = Math.random() < 0.25 ? 1 : 0;
      }
    }

    // Start and end
    const start = { r: 1, c: 1 };
    const end = { r: ROWS - 2, c: COLS - 2 };
    grid[start.r][start.c] = 0;
    grid[end.r][end.c] = 0;

    // Clear path around start and end
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const sr = start.r + dr, sc = start.c + dc;
        const er = end.r + dr, ec = end.c + dc;
        if (sr >= 0 && sr < ROWS && sc >= 0 && sc < COLS) grid[sr][sc] = 0;
        if (er >= 0 && er < ROWS && ec >= 0 && ec < COLS) grid[er][ec] = 0;
      }
    }

    // A* implementation
    function heuristic(a, b) {
      return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
    }

    function astar() {
      const openSet = [{ ...start, g: 0, f: heuristic(start, end), parent: null }];
      const closed = new Set();
      const visited = [];
      const keyOf = (n) => n.r + ',' + n.c;

      while (openSet.length > 0) {
        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift();
        const key = keyOf(current);

        if (current.r === end.r && current.c === end.c) {
          // Reconstruct path
          const path = [];
          let node = current;
          while (node) { path.unshift({ r: node.r, c: node.c }); node = node.parent; }
          return { visited, path };
        }

        if (closed.has(key)) continue;
        closed.add(key);
        visited.push({ r: current.r, c: current.c });

        const neighbors = [
          { r: current.r - 1, c: current.c },
          { r: current.r + 1, c: current.c },
          { r: current.r, c: current.c - 1 },
          { r: current.r, c: current.c + 1 },
        ];

        for (const nb of neighbors) {
          if (nb.r < 0 || nb.r >= ROWS || nb.c < 0 || nb.c >= COLS) continue;
          if (grid[nb.r][nb.c] === 1) continue;
          if (closed.has(keyOf(nb))) continue;
          const g = current.g + 1;
          const f = g + heuristic(nb, end);
          openSet.push({ ...nb, g, f, parent: current });
        }
      }
      return { visited, path: [] };
    }

    const result = astar();
    let visitedIdx = 0;
    let pathIdx = 0;
    let animPhase = 'visiting'; // 'visiting' | 'pathing' | 'done'

    function getThemeColors() {
      const s = getComputedStyle(document.documentElement);
      return {
        bg: s.getPropertyValue('--bg-secondary').trim() || '#001d3d',
        wall: s.getPropertyValue('--bg-tertiary').trim() || '#003566',
        accent: s.getPropertyValue('--accent-primary').trim() || '#ffc300',
        accent2: s.getPropertyValue('--accent-secondary').trim() || '#ffd60a',
        visited: s.getPropertyValue('--bg-tertiary').trim() || '#003566',
        text: s.getPropertyValue('--text-primary').trim() || '#fff',
        muted: s.getPropertyValue('--text-muted').trim() || '#6b7f99',
      };
    }

    function draw() {
      const cw = cellW(), ch = cellH();
      const w = canvas.clientWidth, h = canvas.clientHeight;
      const colors = getThemeColors();

      ctx.clearRect(0, 0, w, h);

      // Draw grid
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const x = c * cw, y = r * ch;
          if (grid[r][c] === 1) {
            ctx.fillStyle = colors.wall;
            ctx.globalAlpha = 0.4;
            ctx.fillRect(x + 1, y + 1, cw - 2, ch - 2);
            ctx.globalAlpha = 1;
          }
        }
      }

      // Draw grid lines
      ctx.strokeStyle = colors.muted;
      ctx.globalAlpha = 0.08;
      ctx.lineWidth = 0.5;
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * ch);
        ctx.lineTo(w, r * ch);
        ctx.stroke();
      }
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * cw, 0);
        ctx.lineTo(c * cw, h);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Draw visited cells
      for (let i = 0; i < visitedIdx && i < result.visited.length; i++) {
        const v = result.visited[i];
        const x = v.c * cw, y = v.r * ch;
        ctx.fillStyle = colors.visited;
        ctx.globalAlpha = 0.25;
        ctx.fillRect(x + 2, y + 2, cw - 4, ch - 4);
        ctx.globalAlpha = 1;
      }

      // Draw path
      if (animPhase === 'pathing' || animPhase === 'done') {
        const drawCount = Math.min(pathIdx, result.path.length);
        if (drawCount > 1) {
          ctx.beginPath();
          ctx.moveTo(result.path[0].c * cw + cw / 2, result.path[0].r * ch + ch / 2);
          for (let i = 1; i < drawCount; i++) {
            ctx.lineTo(result.path[i].c * cw + cw / 2, result.path[i].r * ch + ch / 2);
          }
          ctx.strokeStyle = colors.accent;
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.globalAlpha = 0.9;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // Path nodes
        for (let i = 0; i < drawCount; i++) {
          const p = result.path[i];
          ctx.beginPath();
          ctx.arc(p.c * cw + cw / 2, p.r * ch + ch / 2, 3, 0, Math.PI * 2);
          ctx.fillStyle = colors.accent2;
          ctx.fill();
        }
      }

      // Start and End labels
      ctx.font = `bold ${Math.max(8, cw * 0.28)}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Start node
      ctx.fillStyle = colors.accent;
      ctx.globalAlpha = 0.9;
      const startX = start.c * cw + cw / 2, startY = start.r * ch + ch / 2;
      ctx.beginPath();
      ctx.arc(startX, startY, Math.min(cw, ch) * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.globalAlpha = 1;
      ctx.font = `bold ${Math.max(6, cw * 0.22)}px 'JetBrains Mono', monospace`;
      ctx.fillText('S', startX, startY + 1);

      // End node
      ctx.fillStyle = colors.accent2;
      ctx.globalAlpha = 0.9;
      const endX = end.c * cw + cw / 2, endY = end.r * ch + ch / 2;
      ctx.beginPath();
      ctx.arc(endX, endY, Math.min(cw, ch) * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.globalAlpha = 1;
      ctx.font = `bold ${Math.max(6, cw * 0.22)}px 'JetBrains Mono', monospace`;
      ctx.fillText('E', endX, endY + 1);

      // Labels
      ctx.fillStyle = colors.text;
      ctx.globalAlpha = 0.7;
      ctx.font = `500 ${Math.max(8, Math.min(11, cw * 0.42))}px 'Inter', sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('Soar Valley College', start.c * cw + cw + 4, start.r * ch + ch / 2 + 1);
      ctx.textAlign = 'right';
      ctx.fillText('Gati Shakti Vishwavidyalaya', end.c * cw - 4, end.r * ch + ch / 2 + 1);
      ctx.globalAlpha = 1;
    }

    // Progressive animation
    let frameCount = 0;
    registerLoop(() => {
      if (STATE.efficiencyMode) return;
      frameCount++;
      if (frameCount % 2 !== 0) return; // throttle to ~30fps

      if (animPhase === 'visiting') {
        visitedIdx += 2;
        if (visitedIdx >= result.visited.length) {
          animPhase = 'pathing';
        }
      } else if (animPhase === 'pathing') {
        pathIdx += 1;
        if (pathIdx >= result.path.length) {
          animPhase = 'done';
        }
      } else if (animPhase === 'done') {
        // Loop: restart after a pause
        frameCount++;
        if (frameCount > 300) {
          frameCount = 0;
          visitedIdx = 0;
          pathIdx = 0;
          animPhase = 'visiting';
        }
      }

      resizeCanvas();
      draw();
    });

    window.addEventListener('resize', () => {
      resizeCanvas();
      draw();
    });
  })();

  /* ----------------------------------------------------------
     6. PROJECT CARDS — Interactive Hover Effects
  ---------------------------------------------------------- */

  // 6A. Ocean / Waveglider — Ripple effect
  (function initOceanCard() {
    const canvas = document.getElementById('ocean-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const card = document.getElementById('card-ocean');
    let isHovered = false;
    let time = 0;

    function resize() {
      canvas.width = card.clientWidth;
      canvas.height = card.clientHeight;
    }
    resize();

    card.addEventListener('mouseenter', () => { isHovered = true; });
    card.addEventListener('mouseleave', () => { isHovered = false; });

    registerLoop(() => {
      if (STATE.efficiencyMode) return;
      resize();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += isHovered ? 0.04 : 0.015;

      const isDark = STATE.theme === 'dark';
      const baseColor = isDark ? [0, 53, 102] : [226, 221, 210];
      const waveColor = isDark ? [255, 195, 0] : [184, 134, 11];

      const rows = 20;
      for (let i = 0; i < rows; i++) {
        const y = (canvas.height / rows) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= canvas.width; x += 4) {
          const amplitude = isHovered ? 12 + i * 0.8 : 4 + i * 0.3;
          const freq = 0.02 + i * 0.001;
          const dy = Math.sin(x * freq + time + i * 0.5) * amplitude;
          ctx.lineTo(x, y + dy);
        }
        const alpha = isHovered ? 0.15 + (i / rows) * 0.3 : 0.05 + (i / rows) * 0.1;
        const mix = i / rows;
        const r = Math.floor(baseColor[0] + (waveColor[0] - baseColor[0]) * mix);
        const g = Math.floor(baseColor[1] + (waveColor[1] - baseColor[1]) * mix);
        const b = Math.floor(baseColor[2] + (waveColor[2] - baseColor[2]) * mix);
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });
  })();

  // 6B. F1 Telemetry — 2D Line Chart
  (function initF1Card() {
    const canvas = document.getElementById('f1-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const card = document.getElementById('card-f1');
    let isHovered = false;
    let sweepX = 0;

    function resize() {
      canvas.width = card.clientWidth;
      canvas.height = card.clientHeight;
    }
    resize();

    card.addEventListener('mouseenter', () => { isHovered = true; sweepX = 0; });
    card.addEventListener('mouseleave', () => { isHovered = false; });

    // Generate fake telemetry data — multiple channels
    const channels = [];
    const channelCount = 4;
    const points = 200;
    for (let ch = 0; ch < channelCount; ch++) {
      const data = [];
      let v = 0.3 + Math.random() * 0.4;
      for (let i = 0; i < points; i++) {
        v += (Math.random() - 0.5) * 0.06;
        v = Math.max(0.05, Math.min(0.95, v));
        data.push(v);
      }
      channels.push(data);
    }

    const channelColors = [
      ['rgba(255,195,0,', 'rgba(204,154,6,'],     // speed
      ['rgba(255,214,10,', 'rgba(184,134,11,'],   // throttle
      ['rgba(0,53,102,',   'rgba(0,29,61,'],      // brake
      ['rgba(107,127,153,','rgba(90,115,148,'],   // gear
    ];

    registerLoop(() => {
      if (STATE.efficiencyMode) return;
      resize();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isHovered) sweepX = Math.min(sweepX + 3, canvas.width);
      else sweepX = Math.max(sweepX - 5, 0);

      if (sweepX <= 0) return;

      const isDark = STATE.theme === 'dark' ? 0 : 1;

      for (let ch = 0; ch < channelCount; ch++) {
        const data = channels[ch];
        ctx.beginPath();
        for (let i = 0; i < points; i++) {
          const x = (i / points) * canvas.width;
          if (x > sweepX) break;
          const y = (1 - data[i]) * canvas.height * 0.7 + canvas.height * 0.1 + ch * 8;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const alpha = 0.4 + ch * 0.1;
        ctx.strokeStyle = channelColors[ch][isDark] + alpha + ')';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Sweep line
      ctx.beginPath();
      ctx.moveTo(sweepX, 0);
      ctx.lineTo(sweepX, canvas.height);
      const sweepColor = isDark === 0 ? 'rgba(255,195,0,0.4)' : 'rgba(204,154,6,0.4)';
      ctx.strokeStyle = sweepColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  })();

  // 6C. Supply Chain — Isometric Grid with Agents
  (function initSupplyCard() {
    const canvas = document.getElementById('supply-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const card = document.getElementById('card-supply');
    let isHovered = false;
    let time = 0;

    function resize() {
      canvas.width = card.clientWidth;
      canvas.height = card.clientHeight;
    }
    resize();

    card.addEventListener('mouseenter', () => { isHovered = true; });
    card.addEventListener('mouseleave', () => { isHovered = false; });

    // Isometric nodes
    const nodes = [];
    const nodeCount = 12;
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: 0.1 + Math.random() * 0.8,
        y: 0.1 + Math.random() * 0.8,
      });
    }

    // Edges (connect nearby nodes)
    const edges = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        if (Math.sqrt(dx * dx + dy * dy) < 0.35) {
          edges.push([i, j]);
        }
      }
    }

    // Agents
    const agents = [];
    for (let i = 0; i < 5; i++) {
      const edgeIdx = Math.floor(Math.random() * edges.length);
      agents.push({
        edge: edgeIdx,
        t: Math.random(),
        speed: 0.003 + Math.random() * 0.005,
        dir: 1,
      });
    }

    registerLoop(() => {
      if (STATE.efficiencyMode) return;
      resize();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.01;

      const isDark = STATE.theme === 'dark';
      const nodeColor = isDark ? 'rgba(255,195,0,' : 'rgba(204,154,6,';
      const edgeColor = isDark ? 'rgba(0,53,102,' : 'rgba(226,221,210,';
      const agentColor = isDark ? '#ffd60a' : '#b8860b';

      const w = canvas.width, h = canvas.height;

      // Draw edges
      for (const [i, j] of edges) {
        ctx.beginPath();
        ctx.moveTo(nodes[i].x * w, nodes[i].y * h);
        ctx.lineTo(nodes[j].x * w, nodes[j].y * h);
        ctx.strokeStyle = edgeColor + (isHovered ? '0.3)' : '0.1)');
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw nodes
      for (let i = 0; i < nodeCount; i++) {
        const r = isHovered ? 5 : 3;
        ctx.beginPath();
        ctx.arc(nodes[i].x * w, nodes[i].y * h, r, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor + (isHovered ? '0.7)' : '0.2)');
        ctx.fill();

        // Glow
        if (isHovered) {
          ctx.beginPath();
          ctx.arc(nodes[i].x * w, nodes[i].y * h, r + 6, 0, Math.PI * 2);
          ctx.fillStyle = nodeColor + '0.1)';
          ctx.fill();
        }
      }

      // Animate agents along edges
      if (isHovered) {
        for (const agent of agents) {
          agent.t += agent.speed * agent.dir;
          if (agent.t > 1) { agent.t = 1; agent.dir = -1; agent.edge = Math.floor(Math.random() * edges.length); }
          if (agent.t < 0) { agent.t = 0; agent.dir = 1; agent.edge = Math.floor(Math.random() * edges.length); }

          const [si, ei] = edges[agent.edge] || edges[0];
          const ax = nodes[si].x + (nodes[ei].x - nodes[si].x) * agent.t;
          const ay = nodes[si].y + (nodes[ei].y - nodes[si].y) * agent.t;

          ctx.beginPath();
          ctx.arc(ax * w, ay * h, 4, 0, Math.PI * 2);
          ctx.fillStyle = agentColor;
          ctx.globalAlpha = 0.9;
          ctx.fill();

          // Glow trail
          ctx.beginPath();
          ctx.arc(ax * w, ay * h, 10, 0, Math.PI * 2);
          ctx.fillStyle = agentColor;
          ctx.globalAlpha = 0.15;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    });
  })();

  /* ----------------------------------------------------------
     7. CONTACT — Terminal Interaction
  ---------------------------------------------------------- */
  (function initTerminal() {
    const output = document.getElementById('terminal-output');
    const inputLine = document.getElementById('terminal-input-line');
    const buttons = document.querySelectorAll('.terminal__btn');

    const contacts = {
      email: {
        cmd: 'cat contacts/email.txt',
        lines: [
          '→ priyanshu.pratik@example.com',
          '  Feel free to reach out for collaborations.',
        ],
        link: 'mailto:priyanshu.pratik@example.com',
        linkText: 'priyanshu.pratik@example.com',
      },
      linkedin: {
        cmd: 'curl linkedin.com/in/priyanshu-pratik',
        lines: [
          '→ linkedin.com/in/priyanshu-pratik',
          '  Let\'s connect professionally.',
        ],
        link: 'https://linkedin.com/in/priyanshu-pratik',
        linkText: 'linkedin.com/in/priyanshu-pratik',
      },
      github: {
        cmd: 'git remote -v origin',
        lines: [
          '→ github.com/ppratik765',
          '  Check out my open source work.',
        ],
        link: 'https://github.com/ppratik765',
        linkText: 'github.com/ppratik765',
      },
    };

    function typeText(el, text, speed = 30) {
      return new Promise((resolve) => {
        let i = 0;
        const interval = setInterval(() => {
          el.textContent += text[i];
          i++;
          if (i >= text.length) {
            clearInterval(interval);
            resolve();
          }
        }, speed);
      });
    }

    async function runCommand(type) {
      if (type === 'clear') {
        output.innerHTML = '';
        return;
      }

      const contact = contacts[type];
      if (!contact) return;

      // Create command line
      const cmdLine = document.createElement('div');
      cmdLine.className = 'terminal__line';
      cmdLine.innerHTML = '<span class="terminal__prompt">visitor@portfolio:~$</span> ';
      const cmdSpan = document.createElement('span');
      cmdSpan.className = 'terminal__cmd';
      cmdLine.appendChild(cmdSpan);
      output.appendChild(cmdLine);

      // Type the command
      await typeText(cmdSpan, contact.cmd, 25);

      // Print output lines
      for (const line of contact.lines) {
        const outLine = document.createElement('div');
        outLine.className = 'terminal__line terminal__output';
        if (line.includes(contact.linkText)) {
          outLine.innerHTML = `→ <a href="${contact.link}" target="_blank" rel="noopener" class="terminal__link">${contact.linkText}</a>`;
        } else {
          outLine.textContent = line;
        }
        outLine.style.opacity = '0';
        output.appendChild(outLine);
        gsap.to(outLine, { opacity: 1, duration: 0.3, delay: 0.1 });
        await new Promise(r => setTimeout(r, 120));
      }

      // Blank line separator
      const blank = document.createElement('div');
      blank.className = 'terminal__line';
      blank.innerHTML = '&nbsp;';
      output.appendChild(blank);

      // Scroll terminal body to bottom
      const body = document.getElementById('terminal-body');
      body.scrollTop = body.scrollHeight;
    }

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        runCommand(btn.dataset.cmd);
      });
    });
  })();

  /* ----------------------------------------------------------
     8. GSAP SCROLL ANIMATIONS
  ---------------------------------------------------------- */
  (function initGSAP() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    // Hero entrance
    const heroTl = gsap.timeline({ delay: 0.5 });
    heroTl
      .to('.hero__tagline', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' })
      .to('.hero__name', { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, '-=0.4')
      .to('.hero__subtitle', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.5')
      .to('.hero__cta-row', { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, '-=0.3')
      .to('.hero__scroll-hint', { opacity: 1, duration: 0.6 }, '-=0.2');

    // Generic reveal animation for .reveal elements
    gsap.utils.toArray('.reveal').forEach(el => {
      gsap.to(el, {
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
      });
    });

    // Reveal from left
    gsap.utils.toArray('.reveal-left').forEach(el => {
      gsap.to(el, {
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        opacity: 1,
        x: 0,
        duration: 0.8,
        ease: 'power3.out',
      });
    });

    // Reveal from right
    gsap.utils.toArray('.reveal-right').forEach(el => {
      gsap.to(el, {
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        opacity: 1,
        x: 0,
        duration: 0.8,
        ease: 'power3.out',
      });
    });

    // Reveal with scale
    gsap.utils.toArray('.reveal-scale').forEach(el => {
      gsap.to(el, {
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        opacity: 1,
        scale: 1,
        duration: 0.7,
        ease: 'back.out(1.4)',
      });
    });

    // Stagger stat cards
    ScrollTrigger.batch('.stat-card', {
      start: 'top 85%',
      onEnter: (batch) => {
        gsap.to(batch, {
          opacity: 1,
          scale: 1,
          stagger: 0.12,
          duration: 0.6,
          ease: 'back.out(1.4)',
        });
      },
    });

    // Stagger project cards
    ScrollTrigger.batch('.project-card', {
      start: 'top 85%',
      onEnter: (batch) => {
        gsap.to(batch, {
          opacity: 1,
          scale: 1,
          stagger: 0.15,
          duration: 0.7,
          ease: 'back.out(1.2)',
        });
      },
    });
  })();

  /* ----------------------------------------------------------
     9. EFFICIENCY MODE
  ---------------------------------------------------------- */
  (function initEfficiency() {
    const btn = document.getElementById('efficiency-btn');

    btn.addEventListener('click', () => {
      STATE.efficiencyMode = !STATE.efficiencyMode;
      btn.classList.toggle('active', STATE.efficiencyMode);
      document.body.classList.toggle('efficiency-mode', STATE.efficiencyMode);

      if (STATE.efficiencyMode) {
        STATE.animationFrames.forEach(h => h.stop());
        // Hide canvases
        document.querySelectorAll('canvas').forEach(c => {
          if (c.id !== 'cursor-canvas') c.style.visibility = 'hidden';
        });
        btn.textContent = '🔋 Efficiency On';
      } else {
        STATE.animationFrames.forEach(h => h.start());
        document.querySelectorAll('canvas').forEach(c => {
          c.style.visibility = 'visible';
        });
        btn.textContent = '⚡ Efficiency Mode';
      }
    });
  })();

  /* ----------------------------------------------------------
     10. NAV SCROLL EFFECT
  ---------------------------------------------------------- */
  (function initNav() {
    const nav = document.getElementById('nav');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y > 80) {
        nav.style.boxShadow = '0 4px 30px rgba(0,0,0,0.15)';
      } else {
        nav.style.boxShadow = 'none';
      }
      lastScroll = y;
    });
  })();

})();
