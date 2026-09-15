import { Terminal } from './terminal.js';

// ---------------------------------------------------------------- boot screen
const BOOT_LINES = [
  '**** FRANCISLUZ 64 BASIC V2026 ****',
  '',
  '64K RAM SYSTEM  38911 BASIC BYTES FREE',
  '',
  'READY.',
  'LOAD "FRANCIS.LUZ",8,1',
  '',
  'SEARCHING FOR FRANCIS.LUZ',
  'LOADING',
  'READY.',
  'RUN',
];

async function runBoot() {
  const overlay = document.querySelector('#boot');
  const screen = document.querySelector('#boot-screen');
  if (!overlay) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (sessionStorage.getItem('booted') || reducedMotion) {
    overlay.remove();
    return;
  }

  let skipped = false;
  const skip = () => {
    skipped = true;
  };
  overlay.addEventListener('click', skip);
  window.addEventListener('keydown', skip, { once: true });

  for (const line of BOOT_LINES) {
    if (skipped) break;
    const el = document.createElement('div');
    el.textContent = line || ' ';
    screen.appendChild(el);
    await new Promise((r) => setTimeout(r, line === 'LOADING' ? 420 : 130));
  }

  sessionStorage.setItem('booted', '1');
  overlay.classList.add('boot-out');
  setTimeout(() => overlay.remove(), 650);
}

// ---------------------------------------------------------------- hero scenes
const SCENES = [
  { src: '/assets/bg_moster.webp', label: 'MONSTER.PIC' },
  { src: '/assets/bg_coding.webp', label: 'REMOTE.PIC' },
  { src: '/assets/bg_aprilia.webp', label: 'GARAGE.PIC' },
];

function initScenes() {
  const layers = [document.querySelector('#bg-a'), document.querySelector('#bg-b')];
  const label = document.querySelector('#scene-label');
  const btn = document.querySelector('#scene-btn');
  let idx = Math.floor(Math.random() * SCENES.length);
  let front = 0;

  const apply = (i, instant = false) => {
    const back = 1 - front;
    layers[back].style.backgroundImage = `url(${SCENES[i].src})`;
    if (instant) {
      layers[back].style.opacity = 1;
      layers[front].style.opacity = 0;
      front = back;
    } else {
      const img = new Image();
      img.onload = () => {
        layers[back].style.opacity = 1;
        layers[front].style.opacity = 0;
        front = back;
      };
      img.src = SCENES[i].src;
    }
    label.textContent = `${SCENES[i].label} [${i + 1}/${SCENES.length}]`;
  };

  apply(idx, true);

  btn.addEventListener('click', () => {
    idx = (idx + 1) % SCENES.length;
    apply(idx);
  });

  // Preload the other scenes once the page settles.
  window.addEventListener('load', () => {
    SCENES.forEach((s) => {
      const img = new Image();
      img.src = s.src;
    });
  });
}

// ------------------------------------------------------------------- terminal
function initTerminal() {
  const terminal = new Terminal({
    screen: document.querySelector('#t-screen'),
    input: document.querySelector('#t-input'),
    form: document.querySelector('#t-form'),
  });

  let bootedTerminal = false;
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting) && !bootedTerminal) {
        bootedTerminal = true;
        terminal.boot();
        io.disconnect();
      }
    },
    { threshold: 0.35 },
  );
  io.observe(document.querySelector('.terminal'));

  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      if (terminal.busy) return;
      terminal.exec(chip.dataset.cmd);
      document.querySelector('#t-input').focus({ preventScroll: true });
    });
  });
}

// ------------------------------------------------------------------- reveals
function initReveals() {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.15 },
  );
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
}

// ---------------------------------------------------------------------- clock
function initClock() {
  const el = document.querySelector('#clock');
  if (!el) return;
  const tick = () => {
    const now = new Date();
    el.textContent = now
      .toLocaleString('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Europe/Dublin',
      })
      .toUpperCase();
  };
  tick();
  setInterval(tick, 1000);
}

runBoot();
initScenes();
initTerminal();
initReveals();
initClock();
