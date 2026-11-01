/**
 * Main Controller: 3D Navigation, Audio & UI Interactions
 * Giulia de Assis Silva - Portfolio
 */

(function () {
  'use strict';

  // --- 1. SINTETIZADOR DE ÁUDIO WEB AUDIO API ---
  class SoundManager {
    constructor() {
      this.enabled = false;
      this.ctx = null;
      this.initButton();
    }

    initContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    playClick(freq = 800, type = 'sine') {
      if (!this.enabled) return;
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.4, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    }

    playChime() {
      if (!this.enabled) return;
      this.initContext();
      if (!this.ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

          gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.35);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start();
          osc.stop(this.ctx.currentTime + 0.36);
        }, idx * 60);
      });
    }

    initButton() {
      const toggle = document.getElementById('sound-toggle');
      if (!toggle) return;

      toggle.addEventListener('click', () => {
        this.enabled = !this.enabled;
        toggle.classList.toggle('active', this.enabled);
        toggle.setAttribute('aria-pressed', this.enabled ? 'true' : 'false');
        const text = toggle.querySelector('.sound-status');
        if (text) text.textContent = this.enabled ? 'Áudio ON' : 'Áudio OFF';

        if (this.enabled) {
          this.initContext();
          this.playChime();
        }
      });
    }
  }

  const sound = new SoundManager();

  // Som em elementos interativos
  document.addEventListener('DOMContentLoaded', () => {
    const clickables = document.querySelectorAll('a, button, .project-card-featured, .contact-card-link');
    clickables.forEach((el) => {
      el.addEventListener('mouseenter', () => sound.playClick(1100, 'sine'));
      el.addEventListener('click', () => sound.playClick(650, 'triangle'));
    });
  });

  // --- 2. NAVEGAÇÃO & SINCRONIZAÇÃO DA CÂMERA 3D ---
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');
  const mobileToggle = document.getElementById('mobile-toggle');
  const navMenu = document.getElementById('nav-menu');

  // Alternar Menu Mobile
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('open');
      mobileToggle.classList.toggle('open', isOpen);
      mobileToggle.setAttribute('aria-expanded', isOpen);
      document.body.classList.toggle('no-scroll', isOpen);
    });

    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        mobileToggle.classList.remove('open');
        mobileToggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('no-scroll');
      });
    });
  }

  // Scroll Suave e reposicionamento de Câmera 3D ao clicar
  navLinks.forEach((link) => {
    link.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        const headerOffset = 76;
        const targetPos = targetEl.getBoundingClientRect().top + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: targetPos,
          behavior: 'smooth'
        });

        const sectionName = targetId.replace('#', '');
        if (typeof window.navigateTo3DSection === 'function') {
          window.navigateTo3DSection(sectionName);
        }
      }
    });
  });

  // Observer de Seções para atualizar indicador ativo e câmera ao rolar
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach((link) => {
            if (link.getAttribute('href') === `#${id}`) {
              link.classList.add('active');
              link.setAttribute('aria-current', 'page');
            } else {
              link.classList.remove('active');
              link.removeAttribute('aria-current');
            }
          });

          // Move a câmera 3D para acompanhar a seção visível
          if (typeof window.navigateTo3DSection === 'function') {
            window.navigateTo3DSection(id);
          }
        }
      });
    },
    { rootMargin: '-30% 0px -40% 0px', threshold: 0 }
  );

  sections.forEach((sec) => observer.observe(sec));

  // --- 3. SIMULAÇÃO INTERATIVA DE LABIRINTO (FUGA DAS SOMBRAS) ---
  function initMazeCanvas() {
    const canvas = document.getElementById('maze-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width, height;
    function resizeMaze() {
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight || 300;
    }
    resizeMaze();
    window.addEventListener('resize', resizeMaze);

    const cols = 15;
    const rows = 9;
    let player = { x: 1, y: 1, targetX: 1, targetY: 1, lightRadius: 65 };
    let exit = { x: 13, y: 7 };

    const maze = [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1],
      [1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ];

    let lastStepTime = 0;
    let stepIndex = 0;
    const path = [
      { x: 1, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 3 }, { x: 7, y: 3 },
      { x: 7, y: 5 }, { x: 9, y: 5 }, { x: 9, y: 7 }, { x: 13, y: 7 },
      { x: 11, y: 7 }, { x: 11, y: 3 }, { x: 5, y: 3 }, { x: 1, y: 3 }
    ];

    function drawMaze(time) {
      ctx.clearRect(0, 0, width, height);

      const cellW = width / cols;
      const cellH = height / rows;

      if (time - lastStepTime > 1300) {
        lastStepTime = time;
        stepIndex = (stepIndex + 1) % path.length;
        player.targetX = path[stepIndex].x;
        player.targetY = path[stepIndex].y;
      }

      player.x += (player.targetX - player.x) * 0.08;
      player.y += (player.targetY - player.y) * 0.08;

      const px = (player.x + 0.5) * cellW;
      const py = (player.y + 0.5) * cellH;

      ctx.fillStyle = '#080312';
      ctx.fillRect(0, 0, width, height);

      // Labirinto
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (maze[r][c] === 1) {
            ctx.fillStyle = '#160829';
            ctx.fillRect(c * cellW + 1, r * cellH + 1, cellW - 2, cellH - 2);
            ctx.strokeStyle = 'rgba(255, 42, 133, 0.18)';
            ctx.strokeRect(c * cellW + 1, r * cellH + 1, cellW - 2, cellH - 2);
          }
        }
      }

      // Saída do Labirinto
      const ex = (exit.x + 0.5) * cellW;
      const ey = (exit.y + 0.5) * cellH;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(ex, ey, 5 + Math.sin(time * 0.005) * 3, 0, Math.PI * 2);
      ctx.fill();

      // Iluminação do Jogador
      const grad = ctx.createRadialGradient(px, py, 8, px, py, player.lightRadius);
      grad.addColorStop(0, 'rgba(255, 42, 133, 0.4)');
      grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.15)');
      grad.addColorStop(1, 'rgba(8, 3, 18, 0.95)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Avatar
      ctx.shadowColor = '#ff2a85';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ff2a85';
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Status HUD no Canvas
      ctx.fillStyle = '#fbcfe8';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText('FUGA DAS SOMBRAS // SIMULAÇÃO VIVA', 14, 20);

      requestAnimationFrame(drawMaze);
    }
    requestAnimationFrame(drawMaze);
  }

  // --- 4. COPIAR LINK DO PORTFÓLIO ---
  window.copyPortfolioLink = function () {
    navigator.clipboard.writeText(window.location.href).then(() => {
      showToast('Link do portfólio copiado com sucesso!');
      sound.playChime();
    });
  };

  function showToast(msg) {
    let toast = document.getElementById('portfolio-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'portfolio-toast';
      toast.className = 'portfolio-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  // Inicializar
  window.addEventListener('load', () => {
    initMazeCanvas();
  });
})();
