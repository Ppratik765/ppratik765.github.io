/* ============================================================
   PORTFOLIO — js/polish.js
   Home-page-only refinements, all progressive enhancement:
     · hero hands over to About with scroll-linked depth (--hero-p)
     · scroll cue that fades in, then out on first scroll
     · About path timeline that follows the map tour (and can steer it)
   If this file fails to load, the page is complete without it.
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const REDUCE_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- 1. Hero depth + scroll cue ---------- */
  (function initHeroDepth() {
    const hero = document.getElementById('hero');
    if (!hero) return;
    const hint = document.getElementById('hero-scroll-hint');

    if (hint) {
      setTimeout(() => hint.classList.add('is-in'), 2600);
    }

    if (REDUCE_MOTION) return;
    let ticking = false;
    function update() {
      ticking = false;
      const h = hero.offsetHeight || window.innerHeight;
      const y = window.scrollY;
      if (y > h * 1.1) return;                       // fully off-screen: nothing to do
      const p = Math.min(Math.max(y / (h * 0.75), 0), 1);
      hero.style.setProperty('--hero-p', p.toFixed(3));
      if (hint) hint.classList.toggle('is-out', y > 24);
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  })();

  /* ---------- 2. About: path timeline <-> map tour ---------- */
  (function initPathTimeline() {
    const list = document.getElementById('path-timeline');
    if (!list) return;
    const items = Array.from(list.querySelectorAll('.path__item[data-stop]'));

    function setActive(index) {
      items.forEach((li) => li.classList.toggle('is-active', Number(li.dataset.stop) === index));
    }

    window.addEventListener('about:stop', (e) => setActive(e.detail ? e.detail.index : -1));

    list.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-stop]');
      if (!btn) return;
      window.dispatchEvent(new CustomEvent('about:goto', { detail: { index: Number(btn.dataset.stop) } }));
    });
  })();

  /* ---------- 3. Projects: on phones, show the top 7 + a "Show more" button ---------- */
  (function initProjectsCollapse() {
    const grid = document.getElementById('projects-grid');
    const wrap = document.getElementById('projects-more');
    const btn = document.getElementById('projects-more-btn');
    if (!grid || !wrap || !btn) return;

    const VISIBLE = 7;
    const cards = Array.from(grid.querySelectorAll('.project-card'));
    if (cards.length <= VISIBLE) return;                // nothing to hide

    const label = document.getElementById('projects-more-label');
    const count = document.getElementById('projects-more-count');
    const hiddenCount = cards.length - VISIBLE;
    const mq = window.matchMedia('(max-width: 768px)');

    function render(expanded) {
      btn.setAttribute('aria-expanded', String(expanded));
      label.textContent = expanded ? 'Show fewer' : 'Show ' + hiddenCount + ' more projects';
      count.textContent = 'Showing ' + (expanded ? cards.length : VISIBLE) + ' of ' + cards.length;
    }

    function refreshScrollTriggers() {
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    }

    // Collapsed by default; CSS only applies it inside the phone media query.
    grid.classList.add('is-collapsed');
    wrap.hidden = false;
    render(false);

    btn.addEventListener('click', () => {
      const expanding = grid.classList.contains('is-collapsed');
      grid.classList.toggle('is-collapsed', !expanding);
      render(expanding);

      if (expanding) {
        const fresh = cards.slice(VISIBLE);
        if (window.gsap && !REDUCE_MOTION) {
          window.gsap.fromTo(fresh,
            { opacity: 0, y: 28, scale: 0.97 },
            { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power3.out', stagger: 0.07, clearProps: 'transform' });
        } else {
          fresh.forEach((el) => { el.style.opacity = '1'; el.style.transform = 'none'; });
        }
      } else {
        // Collapsing shrinks the page under the visitor's feet, so put them back at the
        // top of the grid. The layout is already changing, so jump rather than animate
        // (a smooth scroll started mid-reflow gets cancelled by the browser).
        requestAnimationFrame(() => {
          const anchor = document.querySelector('#projects .section-label') || document.getElementById('projects');
          if (!anchor) return;
          const top = anchor.getBoundingClientRect().top + window.scrollY - 96;
          window.scrollTo({ top: Math.max(top, 0), behavior: 'instant' });
        });
      }
      refreshScrollTriggers();
    });

    // Rotating a tablet / resizing across the breakpoint: keep layout math honest.
    const onChange = () => refreshScrollTriggers();
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  })();
});
