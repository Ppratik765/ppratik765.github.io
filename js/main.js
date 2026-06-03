/* ============================================================
   PORTFOLIO — js/main.js
   Theme Toggling, ScrollTrigger reveals, Terminal prompt commands
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  /* ----------------------------------------------------------
     1. THEME SWITCHER WITH GSAP TRANSITION
  ---------------------------------------------------------- */
  const themeToggleBtn = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const themeLabel = document.getElementById('theme-label');

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', (e) => {
      const htmlEl = document.documentElement;
      const currentTheme = htmlEl.getAttribute('data-theme') || 'dark';
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

      // 2. Immediately update the iframe
      const heroIframe = document.getElementById('hero-iframe');
      if (heroIframe) {
        heroIframe.src = 'https://shooting-game-st-git-b73568-priyanshu-pratiks-projects-c61974fc.vercel.app/?autoplay=true&theme=' + nextTheme;
      }

      // 3. Create a temporary div overlay covering the entire screen
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.zIndex = '9999';
      overlay.style.pointerEvents = 'none';
      overlay.style.backgroundColor = nextTheme === 'light' ? '#fefae0' : '#000814';

      // 4. Append the overlay to the body
      document.body.appendChild(overlay);

      // 5. Use GSAP to animate the overlay
      gsap.fromTo(overlay, 
        { clipPath: `circle(0px at ${e.clientX}px ${e.clientY}px)` }, 
        { 
          clipPath: `circle(150% at ${e.clientX}px ${e.clientY}px)`, 
          duration: 0.8, 
          ease: "power3.inOut", 
          onComplete: () => {
            // 6. In the onComplete callback:
            // Update the document's data-theme attribute
            htmlEl.setAttribute('data-theme', nextTheme);
            
            // Update the toggle button icon/text
            if (themeIcon) {
              themeIcon.textContent = nextTheme === 'dark' ? '☾' : '☀';
            }
            if (themeLabel) {
              themeLabel.textContent = nextTheme === 'dark' ? 'Light' : 'Dark';
            }
            
            // Dispatch a theme changed event so other scripts can update colors
            const ev = new CustomEvent('theme-changed');
            window.dispatchEvent(ev);

            // Remove the temporary overlay from the DOM
            overlay.remove();
          } 
        }
      );
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
