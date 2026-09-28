/* ============================================================
   PORTFOLIO — js/effects.js
   Magnetic Spotlight, 3D Card Tilt, and Hover Card Animations
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  /* ----------------------------------------------------------
     0. SHARED HELPERS — reduced motion & visibility-gated loops
  ---------------------------------------------------------- */
  const REDUCE_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Runs `frameFn` on requestAnimationFrame only while `el` is on screen,
  // so idle off-screen cards don't burn CPU/GPU forever. Under reduced
  // motion, paints a single static frame instead of looping at all.
  function runCanvasLoop(el, frameFn) {
    if (REDUCE_MOTION) {
      frameFn();
      return;
    }
    let rafId = null;
    function loop() {
      frameFn();
      rafId = requestAnimationFrame(loop);
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && rafId === null) {
          rafId = requestAnimationFrame(loop);
        } else if (!entry.isIntersecting && rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      });
    }, { threshold: 0.01 });
    io.observe(el);
  }

  /* ----------------------------------------------------------
     1. MAGNETIC SPOTLIGHT & 3D TILT
  ---------------------------------------------------------- */
  const cards = document.querySelectorAll('.project-card');
  const termBtns = document.querySelectorAll('.terminal__btn');

  // Universal Spotlight Tracking
  function handleSpotlight(e, element) {
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    element.style.setProperty('--mouse-x', `${x}px`);
    element.style.setProperty('--mouse-y', `${y}px`);
  }

  // Setup terminal buttons spotlight
  termBtns.forEach(btn => {
    btn.addEventListener('mousemove', (e) => handleSpotlight(e, btn));
  });

  // Setup project cards spotlight & tilt
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      handleSpotlight(e, card);
      if (REDUCE_MOTION) return;

      // 3D Card Tilt
      const rect = card.getBoundingClientRect();
      const cardWidth = rect.width;
      const cardHeight = rect.height;
      
      // Calculate mouse coords relative to center of card (-0.5 to 0.5)
      const mouseX = (e.clientX - rect.left) / cardWidth - 0.5;
      const mouseY = (e.clientY - rect.top) / cardHeight - 0.5;

      // Calculate tilt angles (max tilt 24 degrees for dramatic pop)
      const tiltX = (mouseY * -24).toFixed(2);
      const tiltY = (mouseX * 24).toFixed(2);

      card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.045)`;
    });

    card.addEventListener('mouseleave', () => {
      if (!REDUCE_MOTION) {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
      }
      card.style.setProperty('--mouse-x', '50%');
      card.style.setProperty('--mouse-y', '50%');
    });
  });

  /* ----------------------------------------------------------
     2. CARD HOVER VISUALIZATIONS
  ---------------------------------------------------------- */

  // --- Project A: Vector Squadron (Grid Flash & Pulse) ---
  (function initVectorGrid() {
    const canvas = document.getElementById('vector-grid-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const card = canvas.closest('.project-card');
    let isHovered = false;
    let time = 0;

    function resize() {
      if (canvas.width !== card.clientWidth || canvas.height !== card.clientHeight) {
        canvas.width = card.clientWidth;
        canvas.height = card.clientHeight;
      }
    }
    resize();

    card.addEventListener('mouseenter', () => isHovered = true);
    card.addEventListener('mouseleave', () => isHovered = false);

    const dots = [];
    const spacing = 28;

    function animate() {
      resize();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.05;

      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const colorBase = isLight ? 'rgba(113, 97, 239,' : 'rgba(255, 195, 0,';

      // Draw grid intersections
      for (let x = spacing / 2; x < canvas.width; x += spacing) {
        for (let y = spacing / 2; y < canvas.height; y += spacing) {
          // Calculate distance to mouse center (approximate spotlight source)
          let alpha = 0.08;
          if (isHovered) {
            const mx = parseFloat(card.style.getPropertyValue('--mouse-x')) || canvas.width / 2;
            const my = parseFloat(card.style.getPropertyValue('--mouse-y')) || canvas.height / 2;
            const dist = Math.sqrt((x - mx) ** 2 + (y - my) ** 2);
            
            // Pulse wave moving outwards from spotlight center
            const pulse = Math.sin(dist * 0.06 - time * 2.5) * 0.5 + 0.5;
            alpha = Math.max(0.08, 0.75 - (dist / 140)) * (0.2 + 0.8 * pulse);
          }

          ctx.beginPath();
          ctx.arc(x, y, isHovered ? 4.5 : 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `${colorBase}${alpha})`;
          ctx.fill();

          // Connect nodes slightly on hover
          if (isHovered && alpha > 0.35) {
            ctx.strokeStyle = `${colorBase}${alpha * 0.15})`;
            ctx.lineWidth = 0.75;
            ctx.strokeRect(x - spacing/2, y - spacing/2, spacing, spacing);
          }
        }
      }

    }
    runCanvasLoop(card, animate);
  })();

  // --- Project B: Waveglider (Subtle Displacement Ripple) ---
  (function initWaveglider() {
    const canvas = document.getElementById('ocean-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const card = canvas.closest('.project-card');
    let isHovered = false;
    let time = 0;

    function resize() {
      if (canvas.width !== card.clientWidth || canvas.height !== card.clientHeight) {
        canvas.width = card.clientWidth;
        canvas.height = card.clientHeight;
      }
    }
    resize();

    card.addEventListener('mouseenter', () => isHovered = true);
    card.addEventListener('mouseleave', () => isHovered = false);

    function animate() {
      resize();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += isHovered ? 0.045 : 0.01;

      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const baseColor = isLight ? [226, 221, 210] : [0, 53, 102];
      const waveColor = isLight ? [113, 97, 239] : [255, 195, 0];

      const lines = 12;
      for (let i = 0; i < lines; i++) {
        const y = (canvas.height / lines) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= canvas.width; x += 5) {
          const amp = isHovered ? 26 + i * 1.2 : 3 + i * 0.15;
          const freq = 0.015 + i * 0.001;
          const dy = Math.sin(x * freq + time + i * 0.45) * amp;
          ctx.lineTo(x, y + dy);
        }

        const alpha = isHovered ? 0.35 + (i / lines) * 0.35 : 0.06 + (i / lines) * 0.08;
        const mix = i / lines;
        const r = Math.floor(baseColor[0] + (waveColor[0] - baseColor[0]) * mix);
        const g = Math.floor(baseColor[1] + (waveColor[1] - baseColor[1]) * mix);
        const b = Math.floor(baseColor[2] + (waveColor[2] - baseColor[2]) * mix);

        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.lineWidth = isHovered ? 2.0 : 1.25;
        ctx.stroke();
      }

    }
    runCanvasLoop(card, animate);
  })();

  // --- Project C: Beyond the Apex (F1 Telemetry line chart sweeps) ---
  (function initF1Telemetry() {
    const canvas = document.getElementById('f1-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const card = canvas.closest('.project-card');
    let isHovered = false;
    let sweepProgress = 0.001; // small idle amount so a faint trace is always visible

    function resize() {
      if (canvas.width !== card.clientWidth || canvas.height !== card.clientHeight) {
        canvas.width = card.clientWidth;
        canvas.height = card.clientHeight;
      }
    }
    resize();

    card.addEventListener('mouseenter', () => {
      isHovered = true;
      sweepProgress = 0;
    });
    card.addEventListener('mouseleave', () => {
      isHovered = false;
    });

    // Create 3 driver speeds traces
    const channels = [];
    const size = 180;
    for (let c = 0; c < 3; c++) {
      const trace = [];
      let speed = 0.45 + c * 0.1;
      for (let i = 0; i < size; i++) {
        speed += (Math.random() - 0.5) * 0.07;
        speed = Math.max(0.1, Math.min(0.9, speed));
        trace.push(speed);
      }
      channels.push(trace);
    }

    const channelColors = [
      ['rgba(255, 195, 0,', 'rgba(113, 97, 239,'],   // Driver 1: Slate Blue (Accent 1)
      ['rgba(255, 214, 10,', 'rgba(149, 127, 239,'],  // Driver 2: Periwinkle (Accent 2)
      ['rgba(0, 240, 255,', 'rgba(183, 156, 237,'],    // Driver 3: Wisteria (Accent 3)
    ];

    function animate() {
      resize();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isHovered) {
        sweepProgress = Math.min(sweepProgress + 2.5, canvas.width);
      } else {
        sweepProgress = Math.max(sweepProgress - 4, canvas.width * 0.16);
      }

      if (sweepProgress > 0) {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light' ? 1 : 0;

        channels.forEach((trace, idx) => {
          ctx.beginPath();
          for (let i = 0; i < size; i++) {
            const x = (i / size) * canvas.width;
            if (x > sweepProgress) break;
            const y = canvas.height * 0.7 - (trace[i] * canvas.height * 0.5) + idx * 8;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = `${channelColors[idx][isLight]}0.85)`;
          ctx.lineWidth = idx === 0 ? 3.5 : 2.0;
          ctx.stroke();
        });

        // Glowing Vertical Sweep Bar
        ctx.beginPath();
        ctx.moveTo(sweepProgress, 0);
        ctx.lineTo(sweepProgress, canvas.height);
        ctx.strokeStyle = isLight ? 'rgba(113, 97, 239, 0.85)' : 'rgba(255, 195, 0, 0.95)';
        ctx.lineWidth = 2.0;
        ctx.shadowBlur = 10;
        ctx.shadowColor = isLight ? '#7161ef' : '#ffc300';
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      }

    }
    runCanvasLoop(card, animate);
  })();

  // --- Project D: Agentic Supply (Isometric Optimized Route) ---
  (function initSupplyRoute() {
    const canvas = document.getElementById('supply-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const card = canvas.closest('.project-card');
    let isHovered = false;
    let time = 0;

    function resize() {
      if (canvas.width !== card.clientWidth || canvas.height !== card.clientHeight) {
        canvas.width = card.clientWidth;
        canvas.height = card.clientHeight;
      }
    }
    resize();

    card.addEventListener('mouseenter', () => isHovered = true);
    card.addEventListener('mouseleave', () => isHovered = false);

    // Grid coordinates
    const nodes = [
      {x: 0.15, y: 0.5}, {x: 0.35, y: 0.35}, {x: 0.35, y: 0.65},
      {x: 0.55, y: 0.2}, {x: 0.55, y: 0.5}, {x: 0.55, y: 0.8},
      {x: 0.75, y: 0.35}, {x: 0.75, y: 0.65}, {x: 0.9, y: 0.5}
    ];

    const edges = [
      [0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5],
      [3, 6], [4, 6], [4, 7], [5, 7], [6, 8], [7, 8]
    ];

    const agents = [
      { edgeIndex: 0, progress: 0.1, speed: 0.012, forward: true },
      { edgeIndex: 5, progress: 0.4, speed: 0.018, forward: true },
      { edgeIndex: 8, progress: 0.7, speed: 0.01, forward: false },
      { edgeIndex: 11, progress: 0.2, speed: 0.015, forward: true }
    ];

    function animate() {
      resize();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.02;

      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const nodeColor = isLight ? 'rgba(113, 97, 239,' : 'rgba(255, 195, 0,';
      const edgeColor = isLight ? 'rgba(0, 53, 102, 0.08)' : 'rgba(0, 53, 102, 0.15)';
      const activeEdgeColor = isLight ? 'rgba(113, 97, 239, 0.4)' : 'rgba(255, 195, 0, 0.45)';
      const agentColor = isLight ? '#7161ef' : '#ffd60a';

      const w = canvas.width;
      const h = canvas.height;

      // Draw all passive edges
      edges.forEach(([u, v]) => {
        ctx.beginPath();
        ctx.moveTo(nodes[u].x * w, nodes[u].y * h);
        ctx.lineTo(nodes[v].x * w, nodes[v].y * h);
        ctx.strokeStyle = isHovered ? activeEdgeColor : edgeColor;
        ctx.lineWidth = isHovered ? 2.25 : 1;
        ctx.stroke();
      });

      // Draw nodes
      nodes.forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x * w, node.y * h, isHovered ? 6.5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = `${nodeColor}${isHovered ? '0.9' : '0.2'})`;
        ctx.fill();

        if (isHovered) {
          ctx.beginPath();
          ctx.arc(node.x * w, node.y * h, 14, 0, Math.PI * 2);
          ctx.fillStyle = `${nodeColor}0.18)`;
          ctx.fill();
        }
      });

      // Animate agents along routes when hovered
      if (isHovered) {
        agents.forEach(agent => {
          if (agent.forward) {
            agent.progress += agent.speed;
            if (agent.progress >= 1) {
              agent.progress = 0;
              agent.edgeIndex = Math.floor(Math.random() * edges.length);
            }
          } else {
            agent.progress -= agent.speed;
            if (agent.progress <= 0) {
              agent.progress = 1;
              agent.edgeIndex = Math.floor(Math.random() * edges.length);
            }
          }

          const edge = edges[agent.edgeIndex];
          const u = nodes[edge[0]];
          const v = nodes[edge[1]];

          // Interpolated agent coordinate
          const ax = u.x + (v.x - u.x) * agent.progress;
          const ay = u.y + (v.y - u.y) * agent.progress;

          ctx.beginPath();
          ctx.arc(ax * w, ay * h, 5, 0, Math.PI * 2);
          ctx.fillStyle = agentColor;
          ctx.shadowBlur = 16;
          ctx.shadowColor = agentColor;
          ctx.fill();
          ctx.shadowBlur = 0; // reset
        });
      }

    }
    runCanvasLoop(card, animate);
  })();

  // --- Project E: LocalPDF Pro (CLI Cipher text decryption) ---
  (function initLocalPDFHover() {
    const block = document.querySelector('.project-card__decrypt-block');
    if (!block) return;
    const card = block.closest('.project-card');
    
    const words = ["OFFLINE_SECURE", "CIPHER_VERIFIED", "ZERO_TRACKING", "100_PRIVACY"];
    let interval = null;
    
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@&%-+*";

    function decryptEffect() {
      const targetText = words[Math.floor(Math.random() * words.length)];

      if (REDUCE_MOTION) {
        block.textContent = targetText;
        return;
      }

      let iterations = 0;

      clearInterval(interval);
      interval = setInterval(() => {
        block.textContent = targetText.split("")
          .map((char, index) => {
            if (index < iterations) {
              return targetText[index];
            }
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("");

        if (iterations >= targetText.length) {
          clearInterval(interval);
        }
        iterations += 1 / 2;
      }, 25);
    }

    card.addEventListener('mouseenter', decryptEffect);
  })();

  // --- Project F: Aura (Android Audio visualizer EQ bars) ---
  (function initAuraEQ() {
    const canvas = document.getElementById('aura-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const card = canvas.closest('.project-card');
    let isHovered = false;
    let time = 0;

    function resize() {
      if (canvas.width !== card.clientWidth || canvas.height !== card.clientHeight) {
        canvas.width = card.clientWidth;
        canvas.height = card.clientHeight;
      }
    }
    resize();

    card.addEventListener('mouseenter', () => isHovered = true);
    card.addEventListener('mouseleave', () => isHovered = false);

    const barCount = 18;
    const heights = Array(barCount).fill(10);

    function animate() {
      resize();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += isHovered ? 0.06 : 0.015;

      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const color = isLight ? 'rgba(113, 97, 239, 0.75)' : 'rgba(255, 195, 0, 0.85)';

      const w = canvas.width;
      const h = canvas.height;
      const barW = (w * 0.76) / barCount;
      const gap = (w * 0.08) / barCount;
      const startX = w * 0.08;

      for (let i = 0; i < barCount; i++) {
        const targetH = isHovered 
          ? (Math.sin(time + i * 0.8) * 0.5 + 0.5) * h * 0.30 + Math.random() * 8
          : 4 + Math.sin(time * 0.2 + i) * 2;

        heights[i] += (targetH - heights[i]) * 0.35;

        const bx = startX + i * (barW + gap);
        const by = h * 0.45 - heights[i];

        ctx.fillStyle = color;
        ctx.fillRect(bx, by, barW, heights[i]);
      }

    }
    runCanvasLoop(card, animate);
  })();

  // --- Project G: Pulmosense (Lung disease medical scanning lines) ---
  (function initPulmoScan() {
    const canvas = document.getElementById('pulmo-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const card = canvas.closest('.project-card');
    let isHovered = false;
    let scanY = 0;
    let time = 0;

    function resize() {
      if (canvas.width !== card.clientWidth || canvas.height !== card.clientHeight) {
        canvas.width = card.clientWidth;
        canvas.height = card.clientHeight;
      }
    }
    resize();

    card.addEventListener('mouseenter', () => {
      isHovered = true;
      scanY = 0;
    });
    card.addEventListener('mouseleave', () => isHovered = false);

    function animate() {
      resize();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.08;

      const w = canvas.width;
      const h = canvas.height;

      // Draw faint diagnostic grids
      ctx.strokeStyle = 'rgba(39, 201, 63, 0.06)';
      ctx.lineWidth = 0.5;
      const gridSize = 14;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Draw medical sinus wave
      ctx.beginPath();
      for (let x = 0; x < w; x += 2) {
        let wave = Math.sin(x * 0.04 - time * 2) * 5;
        const pulseStart = w * 0.4;
        if (x > pulseStart && x < pulseStart + 60) {
          const t = (x - pulseStart) / 60;
          wave += Math.sin(t * Math.PI * 4) * 38;
        }
        const y = h * 0.5 + wave;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(39, 201, 63, 0.35)';
      ctx.lineWidth = 2.0;
      ctx.stroke();

      if (isHovered) {
        scanY += 6.5;
        if (scanY > h) scanY = 0;

        // Glowing scanning bar
        const gradient = ctx.createLinearGradient(0, scanY - 30, 0, scanY);
        gradient.addColorStop(0, 'rgba(39, 201, 63, 0)');
        gradient.addColorStop(0.8, 'rgba(39, 201, 63, 0.28)');
        gradient.addColorStop(1, 'rgba(39, 201, 63, 0.95)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, scanY - 30, w, 30);

        ctx.strokeStyle = '#27c93f';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(w, scanY);
        ctx.stroke();
      }

    }
    runCanvasLoop(card, animate);
  })();

  // --- Project H: Retro Arcade Suite (Pixel transition block dissolve overlay) ---
  (function initRetroArcadeHover() {
    const canvas = document.getElementById('arcade-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const card = canvas.closest('.project-card');
    let isHovered = false;
    let progress = 0;

    function resize() {
      if (canvas.width !== card.clientWidth || canvas.height !== card.clientHeight) {
        canvas.width = card.clientWidth;
        canvas.height = card.clientHeight;
      }
    }
    resize();

    card.addEventListener('mouseenter', () => {
      isHovered = true;
      progress = 0;
    });
    card.addEventListener('mouseleave', () => isHovered = false);

    // Make pixels blocky and larger
    const cols = 10;
    const rows = 8;
    const totalBlocks = cols * rows;

    // Generate random order for block dissolves
    const blockIndices = Array.from({ length: totalBlocks }, (_, i) => i);
    for (let i = blockIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [blockIndices[i], blockIndices[j]] = [blockIndices[j], blockIndices[i]];
    }

    function animate() {
      resize();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;
      const blockW = w / cols;
      const blockH = h / rows;

      if (isHovered) {
        progress = Math.min(progress + 2.0, totalBlocks);
      } else {
        progress = Math.max(progress - 4.0, 0);
      }

      if (progress > 0) {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        ctx.fillStyle = isLight ? 'rgba(113, 97, 239, 0.28)' : 'rgba(255, 195, 0, 0.32)';

        // Draw blocks up to current progress index
        for (let i = 0; i < Math.floor(progress); i++) {
          const idx = blockIndices[i];
          const c = idx % cols;
          const r = Math.floor(idx / cols);
          ctx.fillRect(c * blockW + 1, r * blockH + 1, blockW - 2, blockH - 2);
        }
      }

    }
    runCanvasLoop(card, animate);
  })();

  // --- Project I: AeroTwin (ATC radar sweep with aircraft blips) ---
  (function initRadarSweep() {
    const canvas = document.getElementById('radar-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const card = canvas.closest('.project-card');
    let isHovered = false;
    let sweepAngle = 0;

    function resize() {
      if (canvas.width !== card.clientWidth || canvas.height !== card.clientHeight) {
        canvas.width = card.clientWidth;
        canvas.height = card.clientHeight;
      }
    }
    resize();

    card.addEventListener('mouseenter', () => isHovered = true);
    card.addEventListener('mouseleave', () => isHovered = false);

    // Aircraft blips: fixed polar coordinates (radius 0-1, angle radians),
    // each with a slow individual drift so the field feels alive.
    const blips = Array.from({ length: 9 }, () => ({
      r: 0.18 + Math.random() * 0.75,
      a: Math.random() * Math.PI * 2,
      speed: (Math.random() - 0.5) * 0.006,
      size: 1.6 + Math.random() * 1.4,
    }));

    function animate() {
      resize();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.min(w, h) * 0.46;

      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const lineColor = isLight ? 'rgba(113, 97, 239,' : 'rgba(57, 255, 20,';
      const sweepSpeed = isHovered ? 0.045 : 0.012;
      sweepAngle += sweepSpeed;

      // Concentric range rings + crosshair
      ctx.strokeStyle = `${lineColor}0.16)`;
      ctx.lineWidth = 1;
      [0.33, 0.66, 1].forEach((f) => {
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * f, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.beginPath();
      ctx.moveTo(cx - maxR, cy); ctx.lineTo(cx + maxR, cy);
      ctx.moveTo(cx, cy - maxR); ctx.lineTo(cx, cy + maxR);
      ctx.stroke();

      // Sweep wedge (faint fill trailing the leading edge)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxR, sweepAngle - 0.9, sweepAngle);
      ctx.closePath();
      const wedgeAlpha = isHovered ? 0.22 : 0.1;
      ctx.fillStyle = `${lineColor}${wedgeAlpha})`;
      ctx.fill();
      ctx.restore();

      // Sweep line
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweepAngle) * maxR, cy + Math.sin(sweepAngle) * maxR);
      ctx.strokeStyle = `${lineColor}${isHovered ? 0.9 : 0.5})`;
      ctx.lineWidth = isHovered ? 2 : 1.25;
      ctx.stroke();

      // Aircraft blips: brighten briefly as the sweep passes over them
      blips.forEach((b) => {
        b.a += b.speed * (isHovered ? 2.5 : 1);
        const bx = cx + Math.cos(b.a) * b.r * maxR;
        const by = cy + Math.sin(b.a) * b.r * maxR;

        let angleDiff = Math.abs(((sweepAngle - b.a) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
        const lit = angleDiff > Math.PI - 0.5;
        const alpha = lit ? 0.95 : 0.28;

        ctx.beginPath();
        ctx.arc(bx, by, b.size, 0, Math.PI * 2);
        ctx.fillStyle = `${lineColor}${alpha})`;
        ctx.fill();

        if (lit) {
          ctx.beginPath();
          ctx.arc(bx, by, b.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = `${lineColor}0.12)`;
          ctx.fill();
        }
      });
    }
    runCanvasLoop(card, animate);
  })();

  // --- Project J: DamageLens (before/after damage-tier swipe reveal) ---
  (function initDamageSwipe() {
    const canvas = document.getElementById('damage-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const card = canvas.closest('.project-card');
    let isHovered = false;
    let sweepX = 0.35; // 0..1 across width, resting position

    function resize() {
      if (canvas.width !== card.clientWidth || canvas.height !== card.clientHeight) {
        canvas.width = card.clientWidth;
        canvas.height = card.clientHeight;
      }
    }
    resize();

    card.addEventListener('mouseenter', () => isHovered = true);
    card.addEventListener('mouseleave', () => isHovered = false);

    // Fixed "buildings" grid with a pre-assigned xBD-style damage tier.
    const tierColors = ['#10b981', '#f59e0b', '#f97316', '#ef4444']; // none/minor/major/destroyed
    const buildings = [];
    const cols = 9, rows = 6;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const roll = Math.random();
        const tier = roll < 0.45 ? 0 : roll < 0.7 ? 1 : roll < 0.9 ? 2 : 3;
        buildings.push({
          x: (c + 0.5) / cols,
          y: (r + 0.5) / rows,
          tier,
          jitter: Math.random() * 0.4 + 0.8,
        });
      }
    }

    function animate() {
      resize();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;

      if (isHovered) {
        sweepX += (Math.sin(Date.now() / 900) * 0.5 + 0.5 - sweepX) * 0.04;
      } else {
        sweepX += (0.35 - sweepX) * 0.06;
      }
      const sweepPx = sweepX * w;
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const gridColor = isLight ? 'rgba(0, 53, 102, 0.06)' : 'rgba(255, 255, 255, 0.05)';

      // Base terrain grid
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      const g = 16;
      for (let x = 0; x < w; x += g) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += g) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      // Buildings: left of the swipe line render as flat "pre-disaster" gray
      // squares; right of it render classified into their xBD damage tier.
      const size = Math.min(w / cols, h / rows) * 0.32;
      buildings.forEach((b) => {
        const bx = b.x * w;
        const by = b.y * h;
        const classified = bx > sweepPx;
        ctx.fillStyle = classified
          ? `${tierColors[b.tier]}${isHovered ? 'e6' : '80'}`
          : (isLight ? 'rgba(0, 53, 102, 0.22)' : 'rgba(255, 255, 255, 0.22)');
        const s = size * b.jitter;
        ctx.fillRect(bx - s / 2, by - s / 2, s, s);
      });

      // Sweep divider line + handle
      ctx.beginPath();
      ctx.moveTo(sweepPx, 0);
      ctx.lineTo(sweepPx, h);
      ctx.strokeStyle = isLight ? 'rgba(113, 97, 239, 0.85)' : 'rgba(255, 195, 0, 0.9)';
      ctx.lineWidth = 2;
      ctx.shadowBlur = isHovered ? 10 : 0;
      ctx.shadowColor = isLight ? '#7161ef' : '#ffc300';
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    runCanvasLoop(card, animate);
  })();

  /* ----------------------------------------------------------
     3. NEWER CARD VISUALIZATIONS
        (ITS twin, ambulance fusion, F1 Monte Carlo, WaveDrop,
         manganese satellite scan, FloraLens leaf scan)
  ---------------------------------------------------------- */
  function accentRGB() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? '113, 97, 239' : '255, 195, 0';
  }
  function fitCanvas(canvas, card) {
    if (canvas.width !== card.clientWidth || canvas.height !== card.clientHeight) {
      canvas.width = card.clientWidth;
      canvas.height = card.clientHeight;
    }
  }
  function hoverState(card) {
    const st = { on: false };
    card.addEventListener('mouseenter', () => { st.on = true; });
    card.addEventListener('mouseleave', () => { st.on = false; });
    return st;
  }

  // --- 3D ITS Digital Twin: tracked vehicles on a perspective road + BEV inset ---
  (function initITSTwin() {
    const canvas = document.getElementById('its-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const card = canvas.closest('.project-card');
    const hv = hoverState(card);
    const LANES = 4;
    const cars = Array.from({ length: 10 }, (_, i) => ({
      lane: i % LANES, t: Math.random(), v: 0.0028 + Math.random() * 0.003,
      id: 12 + i * 7, truck: i % 4 === 0,
    }));
    let time = 0;
    const laneC = (lane) => (lane + 0.5 - LANES / 2) / (LANES / 2);
    function proj(off, t, w, h) {
      const e = t * t;
      return { x: w * 0.5 + off * w * 0.5 * e, y: h * 0.1 + h * 0.92 * e, s: 0.12 + e * 0.95 };
    }
    function animate() {
      fitCanvas(canvas, card);
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const A = accentRGB();
      time += 1;
      ctx.lineWidth = 1;
      for (let l = 0; l <= LANES; l++) {
        const off = (l - LANES / 2) / (LANES / 2);
        ctx.strokeStyle = `rgba(${A}, 0.2)`;
        ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.1); ctx.lineTo(w * 0.5 + off * w * 0.5, h * 1.02); ctx.stroke();
      }
      for (let k = 0; k < 9; k++) {
        const t = ((k / 9) + time * 0.0018 * (hv.on ? 2 : 1)) % 1;
        const y = h * 0.1 + h * 0.92 * t * t;
        ctx.strokeStyle = `rgba(${A}, ${0.04 + t * 0.09})`;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      cars.sort((a, b) => a.t - b.t);
      const k = w / 640;
      cars.forEach((c) => {
        c.t += c.v * (hv.on ? 2.2 : 1);
        if (c.t > 1.06) { c.t = 0.03; c.lane = (Math.random() * LANES) | 0; }
        const p = proj(laneC(c.lane), c.t, w, h);
        const tail = proj(laneC(c.lane), Math.max(0, c.t - 0.07), w, h);
        const bw = (c.truck ? 66 : 46) * p.s * Math.max(k, 0.7), bh = (c.truck ? 46 : 30) * p.s * Math.max(k, 0.7);
        ctx.strokeStyle = `rgba(${A}, ${0.12 + p.s * 0.3})`;
        ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        ctx.fillStyle = `rgba(${A}, ${0.05 + p.s * 0.08})`;
        ctx.fillRect(p.x - bw / 2, p.y - bh, bw, bh);
        ctx.strokeStyle = `rgba(${A}, ${0.35 + p.s * 0.5})`;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(p.x - bw / 2, p.y - bh, bw, bh);
        ctx.lineWidth = 1;
        if (p.s > 0.5) {
          ctx.fillStyle = `rgba(${A}, 0.9)`;
          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.fillText('#' + c.id, p.x - bw / 2 + 3, p.y - bh - 4);
        }
      });
      // bird's-eye inset (homography view) on hover
      if (hv.on) {
        const bx = w * 0.74, by = h * 0.12, bw2 = w * 0.2, bh2 = h * 0.34;
        ctx.strokeStyle = `rgba(${A}, 0.6)`;
        ctx.strokeRect(bx, by, bw2, bh2);
        for (let l = 1; l < LANES; l++) { ctx.beginPath(); ctx.moveTo(bx + bw2 * l / LANES, by); ctx.lineTo(bx + bw2 * l / LANES, by + bh2); ctx.strokeStyle = `rgba(${A}, 0.2)`; ctx.stroke(); }
        cars.forEach((c) => {
          ctx.fillStyle = `rgba(${A}, 0.95)`;
          ctx.fillRect(bx + bw2 * (c.lane + 0.5) / LANES - 2.5, by + bh2 * (1 - Math.min(c.t, 1)) - 4, 5, 8);
        });
      }
    }
    runCanvasLoop(card, animate);
  })();

  // --- Ambulance Corridor: scrolling Mel-spectrogram, siren sweep, signal preemption ---
  (function initAmbulanceFusion() {
    const canvas = document.getElementById('ambulance-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const card = canvas.closest('.project-card');
    const hv = hoverState(card);
    const ROWS = 18;
    const cols = [];
    let time = 0, fusion = 0;
    function animate() {
      fitCanvas(canvas, card);
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const A = accentRGB();
      time += hv.on ? 0.09 : 0.035;
      const cw = 7, maxCols = Math.ceil(w / cw) + 1;
      // new column: noise floor + a wailing siren ridge
      const center = ROWS * 0.5 + Math.sin(time * 1.3) * ROWS * 0.32;
      const col = [];
      for (let r = 0; r < ROWS; r++) {
        const d = Math.abs(r - center);
        const siren = Math.exp(-d * d / 2.2) * (0.55 + 0.45 * Math.sin(time * 3.1 + r * 0.2));
        col.push(Math.min(1, Math.random() * 0.16 + siren + (r < 4 ? 0.06 : 0)));
      }
      cols.push(col);
      while (cols.length > maxCols) cols.shift();
      const top = h * 0.08, rh = (h * 0.5) / ROWS;
      for (let i = 0; i < cols.length; i++) {
        const x = w - (cols.length - i) * cw;
        for (let r = 0; r < ROWS; r++) {
          const v = cols[i][r];
          if (v < 0.12) continue;
          ctx.fillStyle = `rgba(${A}, ${Math.min(0.95, v * 0.9)})`;
          ctx.fillRect(x, top + (ROWS - 1 - r) * rh, cw - 1, rh - 1);
        }
      }
      // fusion meter + signal head
      const target = hv.on ? 1 : 0.28 + 0.2 * Math.sin(time * 0.7);
      fusion += (target - fusion) * 0.05;
      const my = top + h * 0.5 + 12;
      ctx.strokeStyle = `rgba(${A}, 0.35)`;
      ctx.strokeRect(w * 0.08, my, w * 0.4, 6);
      ctx.fillStyle = `rgba(${A}, 0.85)`;
      ctx.fillRect(w * 0.08, my, w * 0.4 * fusion, 6);
      const thr = w * 0.08 + w * 0.4 * 0.75;
      ctx.fillStyle = `rgba(${A}, 0.8)`;
      ctx.fillRect(thr - 1, my - 4, 2, 14);
      const go = fusion > 0.75;
      const lx = w * 0.56, ly = my - 4;
      ctx.fillStyle = go ? 'rgba(90, 90, 90, 0.5)' : 'rgba(255, 90, 80, 0.9)'; ctx.beginPath(); ctx.arc(lx, ly + 5, 4, 0, 6.283); ctx.fill();
      ctx.fillStyle = go ? 'rgba(70, 230, 140, 0.95)' : 'rgba(90, 90, 90, 0.5)'; ctx.beginPath(); ctx.arc(lx + 14, ly + 5, 4, 0, 6.283); ctx.fill();
    }
    runCanvasLoop(card, animate);
  })();

  // --- F1 Monte Carlo: simulated finishes rain down and pile up into a distribution ---
  (function initMonteCarlo() {
    const canvas = document.getElementById('f1sim-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const card = canvas.closest('.project-card');
    const hv = hoverState(card);
    const BINS = 12;
    const counts = new Array(BINS).fill(0);
    const drops = [];
    // skewed finishing distribution: front-runners more likely, long tail
    const weights = Array.from({ length: BINS }, (_, i) => Math.exp(-i * 0.32) + (i === BINS - 1 ? 0.18 : 0.02));
    const total = weights.reduce((a, b) => a + b, 0);
    function pick() {
      let r = Math.random() * total;
      for (let i = 0; i < BINS; i++) { r -= weights[i]; if (r <= 0) return i; }
      return BINS - 1;
    }
    function animate() {
      fitCanvas(canvas, card);
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const A = accentRGB();
      const left = w * 0.06, span = w * 0.88, bw = span / BINS;
      const base = h * 0.6, maxH = h * 0.5;
      const rate = hv.on ? 5 : 2;
      for (let n = 0; n < rate; n++) {
        const bin = pick();
        drops.push({ x: left + (bin + 0.5) * bw + (Math.random() - 0.5) * bw * 0.5, y: 0, bin, v: 4 + Math.random() * 3 });
      }
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.y += d.v;
        const topY = base - (counts[d.bin] / 40) * maxH;
        ctx.fillStyle = `rgba(${A}, 0.85)`;
        ctx.fillRect(d.x - 1.5, d.y - 3, 3, 3);
        if (d.y >= topY) {
          counts[d.bin] += 1;
          drops.splice(i, 1);
          if (counts[d.bin] > 40) for (let j = 0; j < BINS; j++) counts[j] *= 0.55;
        }
      }
      for (let i = 0; i < BINS; i++) {
        const bh = (counts[i] / 40) * maxH;
        ctx.fillStyle = `rgba(${A}, ${i === 0 ? 0.55 : 0.32})`;
        ctx.fillRect(left + i * bw + 2, base - bh, bw - 4, bh);
      }
      ctx.fillStyle = `rgba(${A}, 0.4)`;
      ctx.fillRect(left, base + 1, span, 1);
    }
    runCanvasLoop(card, animate);
  })();

  // --- WaveDrop: an animated QR-style matrix carrying fresh droplets every frame ---
  (function initWaveDrop() {
    const canvas = document.getElementById('wavedrop-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const card = canvas.closest('.project-card');
    const hv = hoverState(card);
    const N = 21;
    const bits = Array.from({ length: N * N }, () => Math.random() < 0.5);
    let time = 0, scan = 0;
    const inFinder = (x, y) => (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7);
    function animate() {
      fitCanvas(canvas, card);
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const A = accentRGB();
      time += 1;
      const flips = hv.on ? 40 : 10;
      for (let i = 0; i < flips; i++) bits[(Math.random() * bits.length) | 0] = Math.random() < 0.5;
      const size = Math.min(w * 0.5, h * 0.6), cell = size / N;
      const ox = w * 0.72 - size / 2, oy = h * 0.4 - size / 2;
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          let on;
          if (inFinder(x, y)) {
            const fx = x % (N - 7 >= 7 ? N - 7 : 7), lx = x >= N - 7 ? x - (N - 7) : x, ly = y >= N - 7 ? y - (N - 7) : y;
            on = lx === 0 || lx === 6 || ly === 0 || ly === 6 || (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4);
          } else on = bits[y * N + x];
          if (!on) continue;
          ctx.fillStyle = `rgba(${A}, ${inFinder(x, y) ? 0.9 : 0.7})`;
          ctx.fillRect(ox + x * cell + 0.5, oy + y * cell + 0.5, cell - 1, cell - 1);
        }
      }
      // camera scan bracket + sweep
      scan = (scan + (hv.on ? 0.02 : 0.008)) % 1;
      const sy = oy + size * scan;
      const g = ctx.createLinearGradient(0, sy - 12, 0, sy + 2);
      g.addColorStop(0, `rgba(${A}, 0)`); g.addColorStop(1, `rgba(${A}, 0.35)`);
      ctx.fillStyle = g; ctx.fillRect(ox, sy - 12, size, 14);
      ctx.strokeStyle = `rgba(${A}, 0.95)`; ctx.lineWidth = 2;
      const m = 8, L = 16, x0 = ox - m, y0 = oy - m, x1 = ox + size + m, y1 = oy + size + m;
      ctx.beginPath();
      ctx.moveTo(x0, y0 + L); ctx.lineTo(x0, y0); ctx.lineTo(x0 + L, y0);
      ctx.moveTo(x1 - L, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + L);
      ctx.moveTo(x0, y1 - L); ctx.lineTo(x0, y1); ctx.lineTo(x0 + L, y1);
      ctx.moveTo(x1 - L, y1); ctx.lineTo(x1, y1); ctx.lineTo(x1, y1 - L);
      ctx.stroke(); ctx.lineWidth = 1;
    }
    runCanvasLoop(card, animate);
  })();

  // --- Manganese: satellite tile with a drifting prospectivity field and scan reticle ---
  (function initManganeseScan() {
    const canvas = document.getElementById('manganese-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const card = canvas.closest('.project-card');
    const hv = hoverState(card);
    let time = 0;
    const field = (x, y, t) =>
      0.5 + 0.28 * Math.sin(x * 0.55 + t * 0.6) * Math.cos(y * 0.7 - t * 0.4) +
      0.22 * Math.sin((x + y) * 0.32 + t * 0.35);
    function animate() {
      fitCanvas(canvas, card);
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const A = accentRGB();
      time += hv.on ? 0.05 : 0.02;
      const cols = 22, cell = w / cols, rows = Math.ceil((h * 0.62) / cell);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const v = field(x, y, time);
          const hot = v > 0.68;
          ctx.fillStyle = hot ? `rgba(${A}, ${0.22 + (v - 0.68) * 2.2})` : `rgba(${A}, ${0.035 + v * 0.05})`;
          ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
          if (hot && hv.on) { ctx.strokeStyle = `rgba(${A}, 0.7)`; ctx.strokeRect(x * cell + 1.5, y * cell + 1.5, cell - 3, cell - 3); }
        }
      }
      const rx = w * (0.5 + 0.34 * Math.sin(time * 0.9)), ry = h * (0.24 + 0.12 * Math.cos(time * 1.3));
      ctx.strokeStyle = `rgba(${A}, 0.95)`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(rx, ry, 16, 0, 6.283); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rx - 26, ry); ctx.lineTo(rx - 8, ry); ctx.moveTo(rx + 8, ry); ctx.lineTo(rx + 26, ry);
      ctx.moveTo(rx, ry - 26); ctx.lineTo(rx, ry - 8); ctx.moveTo(rx, ry + 8); ctx.lineTo(rx, ry + 26);
      ctx.stroke(); ctx.lineWidth = 1;
    }
    runCanvasLoop(card, animate);
  })();

  // --- FloraLens: a scanned leaf with veins lighting up under the scan line ---
  (function initFloraScan() {
    const canvas = document.getElementById('flora-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const card = canvas.closest('.project-card');
    const hv = hoverState(card);
    let scan = 0, lock = 0;
    function leafPath(cx, cy, L, W) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + L / 2);
      ctx.bezierCurveTo(cx + W, cy + L * 0.25, cx + W * 0.85, cy - L * 0.3, cx, cy - L / 2);
      ctx.bezierCurveTo(cx - W * 0.85, cy - L * 0.3, cx - W, cy + L * 0.25, cx, cy + L / 2);
      ctx.closePath();
    }
    function animate() {
      fitCanvas(canvas, card);
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const A = accentRGB();
      const cx = w * 0.72, cy = h * 0.38, L = Math.min(h * 0.62, w * 0.5), W = L * 0.36;
      scan = (scan + (hv.on ? 0.012 : 0.005)) % 1;
      lock += ((hv.on ? 1 : 0.35) - lock) * 0.06;
      leafPath(cx, cy, L, W);
      ctx.fillStyle = `rgba(${A}, 0.08)`; ctx.fill();
      ctx.strokeStyle = `rgba(${A}, 0.7)`; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.save();
      leafPath(cx, cy, L, W); ctx.clip();
      ctx.strokeStyle = `rgba(${A}, 0.55)`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, cy + L / 2); ctx.lineTo(cx, cy - L / 2); ctx.stroke();
      for (let i = 1; i <= 6; i++) {
        const vy = cy + L / 2 - (L * i) / 7.2;
        ctx.beginPath(); ctx.moveTo(cx, vy); ctx.lineTo(cx + W, vy - L * 0.12); ctx.moveTo(cx, vy); ctx.lineTo(cx - W, vy - L * 0.12); ctx.stroke();
      }
      const sy = cy - L / 2 + L * scan;
      const g = ctx.createLinearGradient(0, sy - 26, 0, sy);
      g.addColorStop(0, `rgba(${A}, 0)`); g.addColorStop(1, `rgba(${A}, 0.5)`);
      ctx.fillStyle = g; ctx.fillRect(cx - W - 4, sy - 26, W * 2 + 8, 26);
      ctx.restore();
      ctx.strokeStyle = `rgba(${A}, ${0.5 + 0.5 * lock})`; ctx.lineWidth = 2;
      const pad = 14 + (1 - lock) * 22, bx0 = cx - W - pad, bx1 = cx + W + pad, by0 = cy - L / 2 - pad, by1 = cy + L / 2 + pad, s = 14;
      ctx.beginPath();
      ctx.moveTo(bx0, by0 + s); ctx.lineTo(bx0, by0); ctx.lineTo(bx0 + s, by0);
      ctx.moveTo(bx1 - s, by0); ctx.lineTo(bx1, by0); ctx.lineTo(bx1, by0 + s);
      ctx.moveTo(bx0, by1 - s); ctx.lineTo(bx0, by1); ctx.lineTo(bx0 + s, by1);
      ctx.moveTo(bx1 - s, by1); ctx.lineTo(bx1, by1); ctx.lineTo(bx1, by1 - s);
      ctx.stroke(); ctx.lineWidth = 1;
      // scan progress bar
      ctx.strokeStyle = `rgba(${A}, 0.35)`; ctx.strokeRect(w * 0.08, h * 0.66, w * 0.3, 5);
      ctx.fillStyle = `rgba(${A}, 0.85)`; ctx.fillRect(w * 0.08, h * 0.66, w * 0.3 * scan, 5);
    }
    runCanvasLoop(card, animate);
  })();

});
