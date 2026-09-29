/* ============================================================
   PORTFOLIO — js/main.js
   Theme Toggling, ScrollTrigger reveals, Terminal prompt commands
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const REDUCE_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ----------------------------------------------------------
     0. MOBILE NAV (hamburger / slide-out panel)
  ---------------------------------------------------------- */
  (function initMobileNav() {
    const nav = document.getElementById('nav') || document.querySelector('.nav');
    const toggle = document.getElementById('nav-toggle');
    const links = nav ? nav.querySelectorAll('.nav__links a') : [];
    if (!nav || !toggle) return;

    function closeNav() {
      nav.classList.remove('nav--open');
      document.body.classList.remove('nav-locked');
      toggle.setAttribute('aria-expanded', 'false');
    }
    function openNav() {
      nav.classList.add('nav--open');
      document.body.classList.add('nav-locked');
      toggle.setAttribute('aria-expanded', 'true');
    }

    toggle.addEventListener('click', () => {
      nav.classList.contains('nav--open') ? closeNav() : openNav();
    });
    links.forEach((a) => a.addEventListener('click', closeNav));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeNav();
    });
    const scrim = nav.querySelector('.nav__scrim');
    if (scrim) scrim.addEventListener('click', closeNav);
  })();

  /* ----------------------------------------------------------
     0b. SCROLL PROGRESS BAR + ACTIVE SECTION NAV STATE
  ---------------------------------------------------------- */
  (function initScrollProgress() {
    const bar = document.getElementById('scroll-progress');
    const navLinks = document.querySelectorAll('.nav__links a[href*="#"]');
    const sections = Array.from(document.querySelectorAll('main section[id], body > section[id]'));

    let ticking = false;
    function update() {
      ticking = false;
      if (bar) {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
        bar.style.width = pct + '%';
      }
    }
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();

    // Active section highlighting only applies where in-page sections exist (index.html)
    if (sections.length && navLinks.length && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.getAttribute('id');
          navLinks.forEach((a) => {
            const match = a.getAttribute('href') === `#${id}`;
            a.classList.toggle('active', match);
          });
        });
      }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
      sections.forEach((s) => io.observe(s));
    }
  })();

  /* ----------------------------------------------------------
     0c. KINETIC TITLE SPLIT
     Wraps each line of every .section-title in a masked span so
     it can cascade in line-by-line (see js/main.js §3 and
     css/layout.css). Runs unconditionally — if GSAP never loads,
     the .no-anim / prefers-reduced-motion CSS rules still reveal
     these spans plainly.
  ---------------------------------------------------------- */
  document.querySelectorAll('.section-title').forEach((el) => {
    const lines = el.innerHTML
      .split(/<br\s*\/?>/i)
      .map((s) => s.trim())
      .filter(Boolean);
    el.innerHTML = lines
      .map((line) => `<span class="line-mask"><span>${line}</span></span>`)
      .join('');
  });

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

      // Reduced motion: swap instantly, skip the starfield warp entirely.
      if (REDUCE_MOTION) {
        htmlEl.setAttribute('data-theme', nextTheme);
        localStorage.setItem('portfolio-theme', nextTheme);
        if (themeIcon) themeIcon.textContent = nextTheme === 'dark' ? '☾' : '☀';
        if (themeLabel) themeLabel.textContent = nextTheme === 'dark' ? 'Light' : 'Dark';
        if (heroIframe) {
          heroIframe.src = 'https://vector-squadron-portfolio.vercel.app/?autoplay=true&theme=' + nextTheme;
        }
        hyperspaceRunning = false;
        return;
      }

      let iframeLoaded = false;
      const onLoad = () => {
        iframeLoaded = true;
        if (heroIframe) {
          heroIframe.removeEventListener('load', onLoad);
        }
      };

      // Pre-load iframe theme while animation plays
      if (heroIframe) {
        heroIframe.addEventListener('load', onLoad);
        heroIframe.src =
          'https://vector-squadron-portfolio.vercel.app/?autoplay=true&theme=' + nextTheme;
      } else {
        iframeLoaded = true;
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
      const DUR = 1600;   // total ms
      let t0 = 0;
      let swapped = false;
      let freezeStart = 0;

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
        let ms = now - t0;

        // Hold the animation at the peak of the flash (p = 0.87) until the new iframe theme has finished loading.
        // Capped with a 2-second safety timeout so it transitions anyway if there's a connection failure.
        const peakMs = DUR * 0.87;
        if (ms > peakMs && !iframeLoaded) {
          if (!freezeStart) freezeStart = now;
          const freezeDuration = now - freezeStart;
          if (freezeDuration < 2000) {
            t0 = now - peakMs;
            ms = peakMs;
          }
        }

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
            // Use deterministic per-ray brightness instead of random flicker
            const rayBr = 0.35 + (Math.sin(r * 2.39996) * 0.5 + 0.5) * 0.65;
            ctx.globalAlpha = ra * rayBr;
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
    // GSAP is up — cancel the <head> watchdog that would otherwise force
    // everything visible via the .no-anim CSS escape hatch.
    if (window.__animFallback) clearTimeout(window.__animFallback);
    htmlEl.classList.remove('no-anim');

    gsap.registerPlugin(ScrollTrigger);

    // Hero entrance
    const heroTimeline = gsap.timeline({ delay: 0.3 });
    heroTimeline
      .to('.hero__tagline', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' })
      .to('.hero__name .line-mask > span', { y: '0%', duration: 1, ease: 'power3.out', stagger: 0.12 }, '-=0.5')
      .to('.hero__subtitle', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.6')
      .to('.hero__cta-row', { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, '-=0.5');

    // Generic reveal transitions (section titles use the kinetic line
    // reveal below instead — their outer element never fades as a block)
    gsap.utils.toArray('.reveal').forEach(el => {
      if (el.classList.contains('section-title')) return;
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

    // Kinetic per-line reveal for section titles
    document.querySelectorAll('.section-title').forEach((title) => {
      const lines = title.querySelectorAll('.line-mask > span');
      if (!lines.length) return;
      gsap.to(lines, {
        scrollTrigger: {
          trigger: title,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        y: '0%',
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.1,
      });
    });

    // Stagger stat cards scale + count up any numeric values
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

        batch.forEach((card) => {
          const valueEl = card.querySelector('.stat-card__value[data-count]');
          if (!valueEl || valueEl.dataset.counted) return;
          valueEl.dataset.counted = 'true';

          const target = parseFloat(valueEl.dataset.count);
          const decimals = parseInt(valueEl.dataset.decimals || '0', 10);
          const suffix = valueEl.dataset.suffix || '';

          if (REDUCE_MOTION) {
            valueEl.textContent = target.toFixed(decimals) + suffix;
            return;
          }

          const proxy = { val: 0 };
          valueEl.textContent = (0).toFixed(decimals) + suffix;

          gsap.to(proxy, {
            val: target,
            duration: 1.4,
            ease: 'power2.out',
            delay: 0.15,
            onUpdate: () => {
              valueEl.textContent = proxy.val.toFixed(decimals) + suffix;
            },
            onComplete: () => {
              valueEl.textContent = target.toFixed(decimals) + suffix;
            },
          });
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
    const hiddenInput = document.getElementById('terminal-hidden-input');
    const inputEcho = document.getElementById('terminal-input-echo');

    if (!outputArea || !buttons.length) return;

    /* ---- constants & state ---- */
    const PROMPT = 'visitor@portfolio:~$';
    const RESUME_URL = 'data/Priyanshu_Pratik_Resume.pdf';
    const RESUME_NAME = 'Priyanshu_Pratik_Resume.pdf';
    const COMMANDS = ['about', 'clear', 'date', 'email', 'github', 'help', 'linkedin', 'ls', 'open', 'ping', 'projects', 'resume', 'status', 'theme', 'whoami'];
    const history = [];
    let histIdx = 0;
    let draft = '';
    let busy = false;

    // Project index, read from the cards so it never drifts from the grid.
    function getProjects() {
      return Array.from(document.querySelectorAll('.project-card')).map((card) => {
        const href = card.getAttribute('href') || '';
        const slug = (href.match(/projects\/([^/.]+)\.html/) || [])[1] || '';
        const titleEl = card.querySelector('.project-card__title');
        return { slug, href, title: titleEl ? titleEl.textContent.trim() : slug };
      }).filter((p) => p.slug);
    }

    const scrollDown = () => { termBody.scrollTop = termBody.scrollHeight; };
    const reveal = (el) => {
      el.style.opacity = '0';
      if (typeof gsap !== 'undefined') gsap.to(el, { opacity: 1, duration: 0.3 });
      else el.style.opacity = '1';
    };

    function addPromptLine(text) {
      const line = document.createElement('div');
      line.className = 'terminal__line';
      const prompt = document.createElement('span');
      prompt.className = 'terminal__prompt';
      prompt.textContent = PROMPT;
      const cmd = document.createElement('span');
      cmd.className = 'terminal__cmd';
      cmd.textContent = text || '';
      line.append(prompt, ' ', cmd);
      outputArea.appendChild(line);
      scrollDown();
      return cmd;
    }

    function addOutput(text, opts = {}) {
      const line = document.createElement('div');
      line.className = 'terminal__line terminal__output';
      if (opts.error) line.classList.add('terminal__output--error');
      if (opts.success) line.classList.add('terminal__output--success');
      if (opts.linkText && text.includes(opts.linkText)) {
        const [before, after] = text.split(opts.linkText);
        const a = document.createElement('a');
        a.href = opts.linkHref;
        a.className = 'terminal__link';
        a.textContent = opts.linkText;
        if (/^https?:|^mailto:/.test(opts.linkHref)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
        line.append(before, a, after);
      } else {
        line.textContent = text;
      }
      outputArea.appendChild(line);
      reveal(line);
      scrollDown();
      return line;
    }

    function addSpacer() {
      const d = document.createElement('div');
      d.className = 'terminal__line';
      d.innerHTML = '&nbsp;';
      outputArea.appendChild(d);
      scrollDown();
    }

    // Print a finished command + its output in one go (typed commands).
    function printToTerminal(commandStr, outputLines, isError = false, isSuccess = false) {
      addPromptLine(commandStr);
      outputLines.forEach((t) => addOutput(t, { error: isError, success: isSuccess }));
      addSpacer();
    }

    function typeCommandText(el, text) {
      return new Promise((resolve) => {
        let i = 0;
        const id = setInterval(() => {
          el.textContent += text[i];
          i++;
          scrollDown();
          if (i >= text.length) { clearInterval(id); resolve(); }
        }, 20);
      });
    }

    const clearScreen = () => { outputArea.innerHTML = ''; };

    /* ---- resume: real progress, then the download ---- */
    async function runResume(typed) {
      const cmd = addPromptLine('');
      if (typed) await typeCommandText(cmd, './download_resume.sh');
      else cmd.textContent = 'resume';
      await runResumeBody();
    }

    function triggerResumeDownload() {
      const a = document.createElement('a');
      a.href = RESUME_URL;
      a.download = RESUME_NAME;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    /* ---- commands that type themselves (button clicks) ---- */
    const commandsData = {
      email: {
        command: 'cat contacts/email.txt',
        output: ['→ priyanshupratik07@gmail.com', '  Direct email channel open. Always responsive to optimization, data systems, and research inquiries.'],
        link: 'mailto:priyanshupratik07@gmail.com', linkText: 'priyanshupratik07@gmail.com'
      },
      linkedin: {
        command: 'curl -s https://api.linkedin.com/v2/me',
        output: ['→ linkedin.com/in/priyanshu-pratik-ai', '  Connect with me for professional updates and supply chain optimization posts.'],
        link: 'https://www.linkedin.com/in/priyanshu-pratik-ai', linkText: 'linkedin.com/in/priyanshu-pratik-ai'
      },
      github: {
        command: 'git remote -v show origin',
        output: ['→ github.com/ppratik765', '  Full source for every project above — commits, issues, and the occasional 2am hack.'],
        link: 'https://github.com/ppratik765', linkText: 'github.com/ppratik765'
      }
    };

    async function executeCommand(cmdName) {
      if (busy) return;
      if (cmdName === 'clear') { clearScreen(); return; }
      busy = true;
      try {
        if (cmdName === 'resume') { await runResume(true); return; }
        const data = commandsData[cmdName];
        if (!data) return;
        const cmd = addPromptLine('');
        await typeCommandText(cmd, data.command);
        data.output.forEach((t) => addOutput(t, { linkText: data.linkText, linkHref: data.link }));
        addSpacer();
      } finally { busy = false; }
    }

    /* ---- free-typed commands ---- */
    function findProject(query) {
      const q = query.toLowerCase().replace(/^projects\//, '').replace(/\.html$/, '').trim();
      if (!q) return null;
      const list = getProjects();
      return list.find((p) => p.slug === q) ||
        list.find((p) => p.title.toLowerCase() === q) ||
        list.find((p) => p.slug.includes(q) || p.title.toLowerCase().includes(q)) || null;
    }

    async function processRawCommand(rawCmd) {
      if (busy) return;
      const cmd = rawCmd.trim().toLowerCase();
      const [head, ...rest] = cmd.split(/\s+/);
      const arg = rest.join(' ');

      if (head === 'clear' || head === 'cls') { clearScreen(); return; }

      if (head === 'help') {
        printToTerminal(rawCmd, [
          'AVAILABLE COMMANDS:',
          '  about       - Who is behind this terminal',
          '  projects    - List every project with its shortcut',
          '  open <name> - Jump to a project page (e.g. open damagelens)',
          '  email       - Initialize direct mail protocol',
          '  linkedin    - Retrieve professional network data',
          '  github      - Clone repository manifests',
          '  resume      - Download authorized curriculum vitae',
          '  theme       - Flip between dark and light',
          '  status      - Display system/availability status',
          '  clear       - Clear the screen (or press Ctrl+L)',
          '',
          'TIPS: ↑/↓ recalls history · Tab completes commands and project names'
        ]);
        return;
      }

      if (head === 'resume' || head === 'cv' || cmd === 'get_resume' || cmd === 'download resume' || cmd === './download_resume.sh') {
        busy = true;
        try {
          addPromptLine(rawCmd);
          await runResumeBody();
        } finally { busy = false; }
        return;
      }

      if (head === 'email' || head === 'linkedin' || head === 'github') {
        // typed by the visitor already, so print instantly
        const d = commandsData[head];
        addPromptLine(rawCmd);
        d.output.forEach((t) => addOutput(t, { linkText: d.linkText, linkHref: d.link }));
        addSpacer();
        return;
      }

      if (head === 'about') {
        printToTerminal(rawCmd, [
          'Priyanshu Pratik — AI & Data Science undergrad, Gati Shakti Vishwavidyalaya.',
          'Builds real-time ML systems, edge models and WebGL experiences.',
          'AI engineering internship at BISAG-N behind him. Open to internships.'
        ]);
        return;
      }

      if (head === 'projects') {
        const list = getProjects();
        addPromptLine(rawCmd);
        list.forEach((p, i) => addOutput(String(i + 1).padStart(2, '0') + '  ' + p.title.padEnd(26, ' ') + 'open ' + p.slug));
        addOutput('', {});
        addOutput("Tip: type 'open <name>' to jump to any of them.");
        addSpacer();
        return;
      }

      if (head === 'open') {
        const p = findProject(arg);
        if (!arg) { printToTerminal(rawCmd, ['usage: open <project>   (try: projects)'], true); return; }
        if (!p) { printToTerminal(rawCmd, [`open: ${arg}: no such project`, "Type 'projects' to list them."], true); return; }
        addPromptLine(rawCmd);
        addOutput('→ opening ' + p.title + '…', { success: true });
        addSpacer();
        setTimeout(() => { window.location.href = p.href; }, 450);
        return;
      }

      if (head === 'theme') {
        const t = document.getElementById('theme-toggle');
        if (t) t.click();
        const now = document.documentElement.getAttribute('data-theme') || 'dark';
        printToTerminal(rawCmd, ['→ theme: ' + now], false, true);
        return;
      }

      if (head === 'status' || head === 'whoami') {
        printToTerminal(rawCmd, [
          'USER: visitor',
          'SYSTEM STATUS: Optimal',
          'AUTHOR AVAILABILITY: Open to internships.',
          'CURRENT OBJECTIVE: Building intelligent agentic systems and scalable architecture.'
        ], false, true);
        return;
      }

      if (head === 'ls' || head === 'dir') {
        printToTerminal(rawCmd, ['contacts/   projects/   about/   resume.pdf']);
        return;
      }

      if (head === 'date') { printToTerminal(rawCmd, [new Date().toString()]); return; }

      if (head === 'ping') { printToTerminal(rawCmd, ['PONG. System latency: 12ms. Connection solid.']); return; }

      if (head === 'sudo') {
        printToTerminal(rawCmd, ['visitor is not in the sudoers file.', 'This incident will be reported to Priyanshu.'], true);
        return;
      }

      printToTerminal(rawCmd, [`bash: ${head}: command not found`, "Type 'help' to see a list of available systems."], true);
    }

    // Typed variant of resume: the prompt line is already on screen.
    async function runResumeBody() {
      addOutput('→ ' + RESUME_NAME);
      const bar = addOutput('');
      const W = 24;
      const draw = (pct) => {
        const filled = Math.round((pct / 100) * W);
        bar.textContent = '  [' + '#'.repeat(filled) + '-'.repeat(W - filled) + '] ' + String(Math.round(pct)).padStart(3, ' ') + '%';
      };
      draw(0);
      let size = 0, ok = true;
      const fetched = (async () => {
        try { const r = await fetch(RESUME_URL); if (!r.ok) throw 0; size = (await r.blob()).size; } catch (e) { ok = false; }
      })();
      const t0 = performance.now();
      await new Promise((resolve) => {
        const tick = (now) => {
          const k = Math.min((now - t0) / 1100, 1);
          draw(100 * (1 - Math.pow(1 - k, 3)));
          if (k < 1) requestAnimationFrame(tick); else resolve();
        };
        requestAnimationFrame(tick);
      });
      await fetched;
      if (!ok) {
        addOutput('  Direct fetch unavailable here — opening the file instead.', { error: true });
        window.open(RESUME_URL, '_blank', 'noopener');
      } else {
        triggerResumeDownload();
        addOutput('✓ Saved ' + RESUME_NAME + (size ? ' (' + Math.max(1, Math.round(size / 1024)) + ' KB)' : ''), { success: true });
      }
      addSpacer();
    }

    /* ---- input: echo, history, tab-complete ---- */
    function setInput(v) {
      hiddenInput.value = v;
      inputEcho.textContent = v;
    }

    function complete() {
      const v = hiddenInput.value;
      const lower = v.toLowerCase();
      if (!v.trim()) return;
      const m = lower.match(/^(open)\s+(.*)$/);
      if (m) {
        const pool = getProjects().map((p) => p.slug).filter((s) => s.startsWith(m[2]));
        if (pool.length === 1) setInput('open ' + pool[0]);
        else if (pool.length > 1) { addPromptLine(v); addOutput(pool.join('   ')); addSpacer(); }
        return;
      }
      if (/\s/.test(lower)) return;
      const hits = COMMANDS.filter((c) => c.startsWith(lower));
      if (hits.length === 1) setInput(hits[0] + (hits[0] === 'open' ? ' ' : ''));
      else if (hits.length > 1) { addPromptLine(v); addOutput(hits.join('   ')); addSpacer(); }
    }

    if (hiddenInput && inputEcho) {
      termBody.addEventListener('click', () => hiddenInput.focus());

      hiddenInput.addEventListener('input', (e) => { inputEcho.textContent = e.target.value; });

      hiddenInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const raw = hiddenInput.value.trim();
          setInput('');
          if (raw) {
            if (history[history.length - 1] !== raw) history.push(raw);
            histIdx = history.length;
            draft = '';
            processRawCommand(raw);
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (!history.length) return;
          if (histIdx === history.length) draft = hiddenInput.value;
          histIdx = Math.max(0, histIdx - 1);
          setInput(history[histIdx]);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (histIdx >= history.length) return;
          histIdx = Math.min(history.length, histIdx + 1);
          setInput(histIdx === history.length ? draft : history[histIdx]);
        } else if (e.key === 'Tab') {
          e.preventDefault();
          complete();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
          e.preventDefault();
          clearScreen();
        }
      });
    }

    // Attach to buttons (keeps existing functionality)
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const cmdName = btn.dataset.cmd;
        if (cmdName) executeCommand(cmdName);
      });
    });
  })();

});
