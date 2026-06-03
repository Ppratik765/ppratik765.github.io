/* ============================================================
   PORTFOLIO — js/main.js
   Theme Toggling, ScrollTrigger reveals, Terminal prompt commands
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  /* ----------------------------------------------------------
     1. THEME SWITCHER WITH GSAP TRANSITION
  ---------------------------------------------------------- */
  const htmlEl = document.documentElement;
  const savedTheme = localStorage.getItem('portfolio-theme');
  const initialTheme = savedTheme || 'dark';

  // Apply saved theme on initial load if not already set by head script
  if (savedTheme) {
    htmlEl.setAttribute('data-theme', savedTheme);
  }

  const themeToggleBtn = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const themeLabel = document.getElementById('theme-label');
  const heroIframe = document.getElementById('hero-iframe');

  // Sync initial UI state with the current theme
  if (themeIcon) {
    themeIcon.textContent = initialTheme === 'dark' ? '☾' : '☀';
  }
  if (themeLabel) {
    themeLabel.textContent = initialTheme === 'dark' ? 'Light' : 'Dark';
  }
  if (heroIframe) {
    heroIframe.src = 'https://vector-squadron-portfolio.vercel.app/?autoplay=true&theme=' + initialTheme;
  }

  /* ---- Hyperspace Jump Theme Transition ---- */
  let hyperspaceRunning = false;

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      if (hyperspaceRunning) return;
      hyperspaceRunning = true;

      const currentTheme = htmlEl.getAttribute('data-theme') || 'dark';
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

      // Pre-load iframe theme while animation plays
      if (heroIframe) {
        heroIframe.src =
          'https://vector-squadron-portfolio.vercel.app/?autoplay=true&theme=' + nextTheme;
      }

      /* ============================================
         CANVAS SETUP  (HiDPI aware)
      ============================================ */
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = window.innerWidth;
      const H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.cssText =
        'position:fixed;top:0;left:0;width:100vw;height:100vh;' +
        'z-index:9999;pointer-events:none;opacity:0;transition:opacity 130ms ease-out;';
      ctx.scale(dpr, dpr);
      document.body.appendChild(canvas);

      // Fill canvas solid black before first frame — no flash of underlying page
      ctx.fillStyle = '#000108';
      ctx.fillRect(0, 0, W, H);

      const CX = W * 0.5;
      const CY = H * 0.5;
      const FOCAL = Math.min(W, H) * 0.75;
      const MAX_Z = 1800;

      // Destination flash colour (cream for light, deep navy for dark)
      const FC = nextTheme === 'light'
        ? { r: 254, g: 250, b: 224 }
        : { r: 0, g: 8, b: 20 };

      /* ============================================
         3D STARFIELD  (perspective-projected)
      ============================================ */
      // Scale star count to viewport — DENSE on desktop, reasonable on mobile
      const N = Math.min(900, Math.max(280, Math.floor(W * H / 2400)));
      const stars = [];

      function spawn(far) {
        return {
          x: (Math.random() - 0.5) * W * 3.2,
          y: (Math.random() - 0.5) * H * 3.2,
          z: far ? MAX_Z + Math.random() * 600 : Math.random() * MAX_Z + 60,
          w: 0.4 + Math.random() * 1.8,             // base stroke width (thicker)
          br: 0.55 + Math.random() * 0.45,           // brightness
          hu: Math.random() < 0.70                    // hue
            ? 205 + Math.random() * 35                //   blue-white
            : 40 + Math.random() * 20,                //   gold accent
          sa: 25 + Math.random() * 55,                // saturation
        };
      }
      for (let i = 0; i < N; i++) stars.push(spawn(false));

      /* ============================================
         TIMING  &  SPEED CURVE
         crawl  →  build  →  E X P L O D E
      ============================================ */
      const DUR = 1800;   // total ms (+100ms extra budget)
      let t0 = 0;
      let swapped = false;

      function warp(p) {
        if (p < 0.10) return p * p * 6;              // barely perceptible drift
        if (p < 0.28) return 0.06 + (p - 0.10) * 2;  // steady build
        const q = (p - 0.28) / 0.72;
        return 0.42 + q * q * q * 70;                // BIGGER exponential EXPLOSION
      }

      /* ============================================
         RENDER LOOP
      ============================================ */
      function draw(now) {
        if (!t0) {
          t0 = now;
          // Trigger CSS fade-in after first frame is painted
          canvas.style.opacity = '1';
        }
        const ms = now - t0;
        const p = Math.min(ms / DUR, 1);

        /* ---- motion-blur: semi-transparent clear ---- */
        // Less clearing → longer, brighter trails at peak speed
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        const trail = p < 0.25 ? 0.28 : p < 0.50 ? 0.12 : 0.025;
        ctx.fillStyle = `rgba(0,1,8,${trail})`;
        ctx.fillRect(0, 0, W, H);

        /* ---- warp speed this frame ---- */
        const spd = warp(p);

        /* ---- update 3D positions & collect visible projections ---- */
        const vis = [];
        for (let i = 0; i < N; i++) {
          const s = stars[i];

          // Project BEFORE move (old screen position)
          const oldZ = Math.max(s.z, 0.5);
          const ox = s.x / oldZ * FOCAL + CX;
          const oy = s.y / oldZ * FOCAL + CY;

          // Move star toward camera
          s.z -= spd * 22;

          // Reset stars that pass the camera
          if (s.z < 0.5) { stars[i] = spawn(true); continue; }

          // Project AFTER move (new screen position)
          const nx = s.x / s.z * FOCAL + CX;
          const ny = s.y / s.z * FOCAL + CY;

          // Cull offscreen
          if (nx < -100 || nx > W + 100 || ny < -100 || ny > H + 100) continue;

          // Depth-based brightness & thickness
          const df = 1 - s.z / MAX_Z;
          const alpha = s.br * df * Math.min(p * 5, 1);
          if (alpha < 0.01) continue;
          const lw = s.w * (1 + p * 7) * df;

          vis.push({ ox, oy, nx, ny, alpha, lw, hu: s.hu, sa: s.sa });
        }

        ctx.lineCap = 'round';

        /* ---- PASS 1  ·  soft outer glow  (additive blend) ---- */
        ctx.globalCompositeOperation = 'lighter';
        for (const v of vis) {
          ctx.globalAlpha = v.alpha * 0.18;
          ctx.strokeStyle = `hsl(${v.hu},${v.sa}%,68%)`;
          ctx.lineWidth = v.lw * 6;
          ctx.beginPath();
          ctx.moveTo(v.ox, v.oy);
          ctx.lineTo(v.nx, v.ny);
          ctx.stroke();
        }

        /* ---- PASS 2  ·  bright body ---- */
        ctx.globalCompositeOperation = 'source-over';
        for (const v of vis) {
          ctx.globalAlpha = v.alpha * 0.8;
          ctx.strokeStyle = `hsl(${v.hu},${Math.round(v.sa * 0.35)}%,92%)`;
          ctx.lineWidth = v.lw * 1.2;
          ctx.beginPath();
          ctx.moveTo(v.ox, v.oy);
          ctx.lineTo(v.nx, v.ny);
          ctx.stroke();
        }

        /* ---- PASS 3  ·  white-hot core ---- */
        for (const v of vis) {
          ctx.globalAlpha = v.alpha;
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = v.lw * 0.35;
          ctx.beginPath();
          ctx.moveTo(v.ox, v.oy);
          ctx.lineTo(v.nx, v.ny);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

        /* ---- central tunnel glow  (additive) ---- */
        if (p > 0.06) {
          ctx.globalCompositeOperation = 'lighter';
          const gi = Math.pow(Math.min((p - 0.06) / 0.55, 1), 1.6) * 0.4;
          const gr = 50 + p * 380;
          const cg = ctx.createRadialGradient(CX, CY, 0, CX, CY, gr);
          cg.addColorStop(0,    `rgba(185,212,255,${gi})`);
          cg.addColorStop(0.20, `rgba(120,175,255,${gi * 0.5})`);
          cg.addColorStop(0.55, `rgba(55,95,225,${gi * 0.12})`);
          cg.addColorStop(1,    'rgba(0,0,35,0)');
          ctx.fillStyle = cg;
          ctx.fillRect(0, 0, W, H);
          ctx.globalCompositeOperation = 'source-over';
        }

        /* ---- edge vignette  (focus the eye on the tunnel) ---- */
        if (p > 0.12 && p < 0.83) {
          const vi = Math.min((p - 0.12) / 0.18, 1) * 0.50;
          const vg = ctx.createRadialGradient(
            CX, CY, Math.min(W, H) * 0.22,
            CX, CY, Math.max(W, H) * 0.85
          );
          vg.addColorStop(0, 'rgba(0,0,0,0)');
          vg.addColorStop(1, `rgba(0,0,6,${vi})`);
          ctx.fillStyle = vg;
          ctx.fillRect(0, 0, W, H);
        }

        /* ---- radial god-rays at peak  (additive) ---- */
        if (p > 0.52 && p < 0.83) {
          ctx.globalCompositeOperation = 'lighter';
          const rt = (p - 0.52) / 0.31;
          const ra = Math.sin(rt * Math.PI) * 0.22;
          const nRays = 28;
          ctx.save();
          ctx.translate(CX, CY);
          for (let r = 0; r < nRays; r++) {
            const ang = (r / nRays) * Math.PI * 2 + p * 0.6;
            const len = Math.max(W, H);
            ctx.globalAlpha = ra * (0.35 + Math.random() * 0.65);
            ctx.strokeStyle = 'rgba(200,218,255,1)';
            ctx.lineWidth = 1.2 + rt * 4.5;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
            ctx.stroke();
          }
          ctx.restore();
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        }

        /* ---- flash  (theme swap hidden behind solid colour) ---- */
        if (p > 0.80) {
          const ft = (p - 0.80) / 0.20;
          let fa;
          if (ft < 0.28)      fa = Math.pow(ft / 0.28, 1.6);               // rapid build
          else if (ft < 0.42) fa = 1;                                        // solid hold
          else                fa = 1 - Math.pow((ft - 0.42) / 0.58, 0.55);  // smooth fade

          ctx.fillStyle = `rgba(${FC.r},${FC.g},${FC.b},${fa})`;
          ctx.fillRect(0, 0, W, H);

          // Swap theme under the opaque flash — user never sees the seam
          if (ft >= 0.28 && !swapped) {
            swapped = true;
            htmlEl.setAttribute('data-theme', nextTheme);
            localStorage.setItem('portfolio-theme', nextTheme);
            if (themeIcon) themeIcon.textContent = nextTheme === 'dark' ? '☾' : '☀';
            if (themeLabel) themeLabel.textContent = nextTheme === 'dark' ? 'Light' : 'Dark';
            window.dispatchEvent(new CustomEvent('theme-changed'));
          }
        }

        /* ---- continue or cleanup ---- */
        if (p < 1) {
          requestAnimationFrame(draw);
        } else {
          canvas.remove();
          hyperspaceRunning = false;
        }
      }

      requestAnimationFrame(draw);
    });
  }

  /* ----------------------------------------------------------
     2. GSAP SCROLL ENTRANCE & REVEALS
  ---------------------------------------------------------- */
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    // Hero entrance
    const heroTimeline = gsap.timeline({ delay: 0.3 });
    heroTimeline
      .to('.hero__tagline', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' })
      .to('.hero__name', { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, '-=0.5')
      .to('.hero__subtitle', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.6')
      .to('.hero__cta-row', { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, '-=0.5')
      .to('.hero__scroll-hint', { opacity: 1, duration: 0.5 }, '-=0.2');

    // Generic reveal transitions
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

    // Stagger stat cards scale
    ScrollTrigger.batch('.stat-card', {
      start: 'top 85%',
      onEnter: (batch) => {
        gsap.to(batch, {
          opacity: 1,
          scale: 1,
          stagger: 0.12,
          duration: 0.6,
          ease: 'back.out(1.3)',
        });
      },
    });

    // Stagger project cards sliding scale
    ScrollTrigger.batch('.project-card', {
      start: 'top 85%',
      onEnter: (batch) => {
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          scale: 1,
          stagger: 0.15,
          duration: 0.75,
          ease: 'power3.out',
        });
      },
    });
  }

  /* ----------------------------------------------------------
     3. CONTACT TERMINAL LOGIC
  ---------------------------------------------------------- */
  (function initTerminal() {
    const outputArea = document.getElementById('terminal-output');
    const termBody = document.getElementById('terminal-body');
    const buttons = document.querySelectorAll('.terminal__btn');

    if (!outputArea || !buttons.length) return;

    const commandsData = {
      email: {
        command: 'cat contacts/email.txt',
        output: [
          '→ priyanshupratik07@gmail.com',
          '  Direct email channel open. Always responsive to optimization, data systems, and research inquiries.'
        ],
        link: 'mailto:priyanshupratik07@gmail.com',
        linkText: 'priyanshupratik07@gmail.com'
      },
      linkedin: {
        command: 'curl -s https://api.linkedin.com/v2/me',
        output: [
          '→ linkedin.com/in/priyanshu-pratik-ai',
          '  Connect with me for professional updates and supply chain optimization posts.'
        ],
        link: 'https://www.linkedin.com/in/priyanshu-pratik-ai',
        linkText: 'linkedin.com/in/priyanshu-pratik-ai'
      },
      github: {
        command: 'git remote -v show origin',
        output: [
          '→ github.com/ppratik765',
          '  Check codebases, algorithm templates (160+ LeetCode), and agentic workflows.'
        ],
        link: 'https://github.com/ppratik765',
        linkText: 'github.com/ppratik765'
      }
    };

    function typeCommandText(spanElement, text) {
      return new Promise(resolve => {
        let i = 0;
        const intervalId = setInterval(() => {
          spanElement.textContent += text[i];
          i++;
          if (i >= text.length) {
            clearInterval(intervalId);
            resolve();
          }
        }, 20);
      });
    }

    async function executeCommand(cmdName) {
      if (cmdName === 'clear') {
        outputArea.innerHTML = '';
        return;
      }

      const data = commandsData[cmdName];
      if (!data) return;

      // Add a line representing the prompt + input command
      const commandLine = document.createElement('div');
      commandLine.className = 'terminal__line';
      commandLine.innerHTML = '<span class="terminal__prompt">visitor@portfolio:~$</span> ';
      const cmdSpan = document.createElement('span');
      cmdSpan.className = 'terminal__cmd';
      commandLine.appendChild(cmdSpan);
      outputArea.appendChild(commandLine);

      // Typing simulation
      await typeCommandText(cmdSpan, data.command);

      // Render outputs
      data.output.forEach(lineText => {
        const outLine = document.createElement('div');
        outLine.className = 'terminal__line terminal__output';

        if (lineText.includes(data.linkText)) {
          // Replace link text with clickable anchor
          outLine.innerHTML = `→ <a href="${data.link}" target="_blank" rel="noopener noreferrer" class="terminal__link">${data.linkText}</a>`;
        } else {
          outLine.textContent = lineText;
        }

        outLine.style.opacity = '0';
        outputArea.appendChild(outLine);

        // Animate visibility entry
        gsap.to(outLine, { opacity: 1, duration: 0.3 });
      });

      // Insert separation line
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'terminal__line';
      emptyDiv.innerHTML = '&nbsp;';
      outputArea.appendChild(emptyDiv);

      // Scroll to bottom
      termBody.scrollTop = termBody.scrollHeight;
    }

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const cmdName = btn.dataset.cmd;
        executeCommand(cmdName);
      });
    });
  })();

});
