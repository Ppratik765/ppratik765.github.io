/* ============================================================
   PORTFOLIO — js/effects.js
   Magnetic Spotlight, 3D Card Tilt, and Hover Card Animations
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

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
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
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

      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
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

      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  })();

  // --- Project C: Beyond the Apex (F1 Telemetry line chart sweeps) ---
  (function initF1Telemetry() {
    const canvas = document.getElementById('f1-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const card = canvas.closest('.project-card');
    let isHovered = false;
    let sweepProgress = 0;

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
        sweepProgress = Math.max(sweepProgress - 4, 0);
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

      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
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

      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
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

      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
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

      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
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

      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  })();

});
