import { RESPONSES, AI_ANSWERS, AI_FALLBACK, EXPERIENCE, PROFILE } from './data.js';

const URL_RE = /(https?:\/\/[^\s]+|[\w.+-]+@[\w-]+\.[\w.]+)/g;

function linkify(text) {
  return text.replace(URL_RE, (m) => {
    const href = m.includes('@') ? `mailto:${m}` : m;
    return `<a href="${href}" target="_blank" rel="noopener">${m}</a>`;
  });
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const MAZE_CHARS = ['╱', '╲'];

function mazeLines(rows = 6, cols = 38) {
  const lines = [];
  for (let r = 0; r < rows; r++) {
    let line = '';
    for (let c = 0; c < cols; c++) line += MAZE_CHARS[Math.random() < 0.5 ? 0 : 1];
    lines.push(line);
  }
  return lines;
}

const listOutput = () => [
  '10 REM ***** CAREER.BAS *****',
  ...EXPERIENCE.map(
    (e) => `${e.line + 10} DATA "${e.years}", "${e.company}", "${e.role}"`,
  ),
  `${EXPERIENCE[EXPERIENCE.length - 1].line + 20} END`,
  '',
  'TYPE NOW OR ABOUT FOR THE DETAIL.',
];

export class Terminal {
  constructor({ screen, input, form }) {
    this.screen = screen;
    this.input = input;
    this.form = form;
    this.history = [];
    this.historyIdx = -1;
    this.busy = false;
    this.skipRequested = false;
    this.game = null;

    const submit = () => {
      if (this.busy) {
        this.skipRequested = true;
        return;
      }
      const value = input.value.trim();
      input.value = '';
      if (value) this.exec(value);
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submit();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.history.length) {
          this.historyIdx = Math.max(0, this.historyIdx - 1);
          input.value = this.history[this.historyIdx];
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this.historyIdx < this.history.length - 1) {
          this.historyIdx += 1;
          input.value = this.history[this.historyIdx];
        } else {
          this.historyIdx = this.history.length;
          input.value = '';
        }
      }
    });

    // Clicking anywhere on the terminal focuses the input,
    // unless the user is selecting text or clicking a link.
    screen.closest('.terminal').addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      if (String(window.getSelection())) return;
      input.focus({ preventScroll: true });
    });
  }

  addLine(html = '', cls = '') {
    const el = document.createElement('div');
    el.className = `t-line ${cls}`.trim();
    if (html) el.innerHTML = html;
    this.screen.appendChild(el);
    this.scrollDown();
    return el;
  }

  scrollDown() {
    this.screen.scrollTop = this.screen.scrollHeight;
  }

  echo(value) {
    this.addLine(`<span class="t-prompt">&gt;</span> ${escapeHtml(value)}`, 't-echo');
  }

  // Stream an array of plain-text lines with a typewriter effect.
  stream(lines, { cps = 220, cls = '' } = {}) {
    return new Promise((resolve) => {
      this.busy = true;
      this.skipRequested = false;
      let li = 0;
      let ci = 0;
      let el = null;
      const perTick = Math.max(1, Math.round(cps / 60));

      const finishLine = () => {
        // Swap streamed text for linkified HTML once the line is done.
        el.innerHTML = linkify(escapeHtml(lines[li])) || '&nbsp;';
        li += 1;
        ci = 0;
        el = null;
      };

      const tick = () => {
        if (this.skipRequested) {
          if (el) finishLine();
          for (; li < lines.length; li++) {
            this.addLine(linkify(escapeHtml(lines[li])) || '&nbsp;', cls);
          }
          this.scrollDown();
          this.busy = false;
          resolve();
          return;
        }
        if (li >= lines.length) {
          this.busy = false;
          resolve();
          return;
        }
        if (!el) el = this.addLine('&nbsp;', cls);
        const line = lines[li];
        if (ci >= line.length) {
          finishLine();
        } else {
          ci = Math.min(line.length, ci + perTick);
          el.textContent = line.slice(0, ci);
          this.scrollDown();
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  async thinking(label = 'THINKING') {
    this.busy = true;
    const el = this.addLine('', 't-dim');
    for (let i = 0; i < 9; i++) {
      el.textContent = `${label}${'.'.repeat((i % 3) + 1)}`;
      await new Promise((r) => setTimeout(r, 90));
    }
    el.remove();
  }

  async exec(raw) {
    this.history.push(raw);
    this.historyIdx = this.history.length;
    // Fresh screen for every command — one exchange at a time.
    this.screen.innerHTML = '';
    this.echo(raw);

    const cmd = raw.toLowerCase().replace(/[?!.]+$/, '').trim();

    if (this.game) {
      await this.landerTurn(cmd);
      return;
    }

    if (cmd === 'lander' || cmd === 'play' || cmd === 'game') {
      await this.startLander();
      return;
    }

    const canned = {
      help: RESPONSES.help,
      '?': RESPONSES.help,
      commands: RESPONSES.help,
      about: RESPONSES.about,
      whoami: RESPONSES.about,
      who: RESPONSES.about,
      now: RESPONSES.now,
      today: RESPONSES.now,
      work: listOutput(),
      experience: listOutput(),
      list: listOutput(),
      skills: RESPONSES.skills,
      stack: RESPONSES.skills,
      projects: RESPONSES.projects,
      crypto: RESPONSES.projects,
      contact: RESPONSES.contact,
      socials: RESPONSES.contact,
      links: RESPONSES.contact,
      email: RESPONSES.contact,
    };

    if (cmd === 'clear' || cmd === 'cls') {
      this.screen.innerHTML = '';
      await this.stream(['READY.'], { cls: 't-dim' });
      return;
    }

    if (cmd === 'cv' || cmd === 'resume') {
      await this.stream([
        'FETCHING DOCUMENT...',
        '',
        `Full CV lives on LinkedIn >> ${PROFILE.links.linkedin}`,
      ]);
      return;
    }

    if (cmd === 'run') {
      await this.stream(
        ['10 PRINT CHR$(205.5+RND(1)); : GOTO 10', 'RUN', ...mazeLines(), '', 'BREAK IN 10', 'READY.'],
        { cps: 700 },
      );
      return;
    }

    if (/^goto\s*10$/.test(cmd)) {
      await this.stream(['JUMPING TO LINE 10...']);
      document.querySelector('#top')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (/^\d+\s/.test(cmd)) {
      await this.stream(['LINE STORED IN MEMORY (NOT REALLY).', 'TYPE RUN TO SEE WHAT 1984 FELT LIKE.']);
      return;
    }

    if (cmd.startsWith('sudo')) {
      await this.stream(['USER IS NOT IN THE SUDOERS FILE.', 'THIS INCIDENT WILL BE REPORTED TO A CASSETTE TAPE.']);
      return;
    }

    if (canned[cmd]) {
      await this.stream(canned[cmd]);
      return;
    }

    // Free text → simulated AI.
    await this.thinking();
    const hit = AI_ANSWERS.find((a) => a.match.test(raw));
    await this.stream(hit ? hit.lines : AI_FALLBACK);
  }

  landerStatus() {
    const g = this.game;
    return [
      `TURN ${g.turn}  ·  ALT ${Math.max(0, Math.round(g.alt))} M  ·  VEL ${Math.round(g.vel)} M/S  ·  FUEL ${g.fuel}`,
      'ENTER BURN (0-50):',
    ];
  }

  async startLander() {
    this.game = { alt: 1000, vel: 50, fuel: 150, turn: 1 };
    await this.stream(
      [
        'LUNAR LANDER — (C) 1969, PORTED FROM PURE NOSTALGIA',
        '',
        'YOU ARE 1000 M ABOVE THE MOON, FALLING AT 50 M/S.',
        'GRAVITY ADDS 5 M/S EVERY TURN. YOU HAVE 150 FUEL.',
        'EACH TURN, TYPE HOW MUCH TO BURN (0-50).',
        'TOUCH DOWN UNDER 5 M/S OR BECOME A CRATER.',
        '(TYPE QUIT TO EJECT)',
        '',
        ...this.landerStatus(),
      ],
      { cps: 600 },
    );
  }

  async landerTurn(cmd) {
    const g = this.game;

    if (['quit', 'exit', 'abort', 'eject', 'clear'].includes(cmd)) {
      this.game = null;
      await this.stream(['MISSION ABORTED. THE MOON WILL WAIT.', 'READY.']);
      return;
    }

    const burn = Number.parseInt(cmd, 10);
    if (!Number.isInteger(burn) || burn < 0 || burn > 50) {
      await this.stream(['BURN MUST BE A NUMBER FROM 0 TO 50.', '', ...this.landerStatus()], { cps: 600 });
      return;
    }

    const spent = Math.min(burn, g.fuel);
    const newVel = g.vel + 5 - spent;
    g.fuel -= spent;
    g.alt -= (g.vel + newVel) / 2;
    g.vel = newVel;
    g.turn += 1;

    if (g.alt <= 0) {
      const impact = Math.max(0, Math.round(g.vel));
      this.game = null;
      const ending =
        impact <= 5
          ? ['CONTACT LIGHT. THE EAGLE HAS LANDED.', `TOUCHDOWN AT ${impact} M/S. NEIL WOULD BE PROUD.`]
          : impact <= 15
            ? [`HARD LANDING AT ${impact} M/S.`, 'THE LANDER IS BENT. YOU ARE NOT. TAKE THE WIN.']
            : [`IMPACT AT ${impact} M/S.`, `CONGRATULATIONS ON YOUR NEW ${Math.round(impact / 3)} M DEEP CRATER.`];
      await this.stream([...ending, '', 'TYPE LANDER TO FLY AGAIN.', 'READY.'], { cps: 400 });
      return;
    }

    const flavor = [];
    if (spent < burn) flavor.push(`ONLY ${spent} FUEL LEFT TO BURN.`);
    if (g.fuel === 0) flavor.push('TANKS DRY. NEWTON TAKES THE WHEEL.');
    if (g.vel < 0) flavor.push('YOU ARE CLIMBING. THE MOON IS THE OTHER WAY.');

    await this.stream([...flavor, ...this.landerStatus()], { cps: 600 });
  }

  async boot() {
    await this.stream(
      [
        'ASK-ME 1.0 — SIMULATED INTELLIGENCE, GENUINE FACTS',
        '38911 BASIC BYTES FREE. NO GPU. NO CLOUD. NO CHILL.',
        '',
        'ASK ANYTHING ABOUT FRANCIS, OR TYPE HELP.',
        'READY.',
      ],
      { cps: 420, cls: 't-dim' },
    );
  }
}
