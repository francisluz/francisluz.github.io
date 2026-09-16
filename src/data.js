// Everything the terminal "AI" knows about Francis.
// Plain data so answers stay easy to edit.

export const PROFILE = {
  name: 'Francis Fernandes da Luz',
  handle: 'francisluz',
  location: 'Dublin, Ireland',
  origin: 'Brazil',
  role: 'Senior Software Engineer @ UTXO.AG / Masumi',
  years: '20+',
  links: {
    github: 'https://github.com/francisluz',
    x: 'https://x.com/francisluz',
    linkedin: 'https://www.linkedin.com/in/francisluz',
    sokosumi: 'https://sokosumi.com',
    beginwallet: 'https://begin.is',
  },
};

export const EXPERIENCE = [
  {
    line: 10,
    years: '2025—NOW',
    company: 'UTXO.AG / MASUMI',
    role: 'Senior Software Engineer',
    blurb:
      'Building Sokosumi, an AI agent marketplace. Next.js, Hono, Postgres, Redis, AI SDK. Shipped the full chat interface. Agents hire and pay each other in stablecoins.',
  },
  {
    line: 20,
    years: '2019—2025',
    company: 'JP MORGAN',
    role: 'Cybersecurity Engineer · Tech Lead',
    blurb:
      'Code-scanning tools for every developer in the bank. Secrets-in-code detection (Python), bulk scan fleet on Docker, AWS + Terraform, Go CLI tooling, Grafana monitoring.',
  },
  {
    line: 30,
    years: '2018—2019',
    company: 'STORM TECHNOLOGY',
    role: 'Software Engineer',
    blurb:
      'Custom applications for the Irish government. Led the AngularJS → Angular migration hands-on.',
  },
  {
    line: 40,
    years: '2014—2018',
    company: 'CI&T · BRAZIL',
    role: 'Software Architect / Tech Lead',
    blurb:
      'Serverless music analytics for iHeart Media, Walmart e-commerce, Motorola CRM on GCP + BigQuery. AWS Lambda, React, Node.',
  },
  {
    line: 50,
    years: '2012—2014',
    company: 'SOTTELLI · ANGOLA',
    role: 'Software Architect',
    blurb:
      'National Social Security Institute of Angola. BPM, BizTalk, .NET, and the architecture holding it together.',
  },
  {
    line: 60,
    years: '2007—2012',
    company: 'CI&T / MEGAWORK',
    role: 'Software Architect / .NET Developer',
    blurb: 'C#, SQL Server, Oracle, ABAP. Where the enterprise years began.',
  },
];

export const SKILLS = {
  languages: ['TypeScript', 'Python', 'JavaScript / Node', 'Java', 'Go', 'Rust', 'Bash'],
  frontend: ['React', 'Next.js', 'Angular'],
  cloud: ['AWS', 'GCP', 'Azure', 'Terraform', 'Kubernetes', 'Docker'],
  data: ['Postgres', 'Redis', 'Redshift', 'BigQuery', 'GraphQL'],
  ai: ['AI SDK', 'agent marketplaces', 'chat interfaces', 'claude-agent-sdk tinkering'],
};

const L = PROFILE.links;

// Canned command outputs. Arrays = one string per printed line.
export const RESPONSES = {
  help: [
    'AVAILABLE COMMANDS:',
    '',
    '  ABOUT ....... who is this guy',
    '  WORK ........ 20 years, LISTed like it is 1984',
    '  NOW ......... what he is building today',
    '  SKILLS ...... the stack',
    '  PROJECTS .... side quests (crypto wallet inside)',
    '  CONTACT ..... where to find him',
    '  LANDER ...... land on the moon, 1969 style',
    '  SURF ........ shred a gnarly wave, 1987 style',
    '  BMX ......... backflips over dirt, 1987 style',
    '  CLEAR ....... wipe the screen',
    '',
    'OR JUST ASK ME ANYTHING IN PLAIN ENGLISH.',
    'TRY: "does he ride motorcycles?"',
  ],
  about: [
    'FRANCIS FERNANDES DA LUZ',
    '',
    'Brazilian software engineer living in Dublin.',
    '20+ years of shipping: .NET in Brazil, national',
    'systems in Angola, cybersecurity tooling at',
    'JP Morgan, now an AI agent marketplace.',
    '',
    'First language: BASIC. Hence all of this.',
  ],
  now: [
    'CURRENT: Senior Software Engineer @ UTXO.AG / MASUMI',
    '',
    'Building Sokosumi, an AI agent marketplace where',
    'agents can hire and pay each other in stablecoins.',
    'Full-stack: Next.js frontend, Hono APIs, Postgres,',
    'Redis, CI/CD on Vercel. Built the chat interface',
    'where humans talk to specialized agents.',
    '',
    `>> ${L.sokosumi}`,
  ],
  skills: [
    'SCANNING SKILL MATRIX...',
    '',
    `  LANGUAGES: ${SKILLS.languages.join(', ')}`,
    `  FRONTEND:  ${SKILLS.frontend.join(', ')}`,
    `  CLOUD:     ${SKILLS.cloud.join(', ')}`,
    `  DATA:      ${SKILLS.data.join(', ')}`,
    `  AI:        ${SKILLS.ai.join(', ')}`,
    '',
    '64K RAM WAS ENOUGH TO LEARN ALL OF THIS. EVENTUALLY.',
  ],
  projects: [
    'SIDE QUESTS:',
    '',
    '  BEGIN WALLET: open-source, multi-chain crypto',
    '  wallet. A spare-time experiment with UTXO',
    '  models and smart contracts that turned into a',
    `  real product. >> ${L.beginwallet}`,
    '',
    '  B58 FINANCE: wrote the whitepaper.',
    '',
    `  MORE ON GITHUB >> ${L.github}`,
  ],
  contact: [
    'OPENING CHANNELS...',
    '',
    `  GITHUB .... ${L.github}`,
    `  X ......... ${L.x}`,
    `  LINKEDIN .. ${L.linkedin}`,
    '',
    'CARRIER SIGNAL STRONG. SAY HELLO.',
  ],
};

// Free-text "AI" answers: first pattern that matches wins.
export const AI_ANSWERS = [
  {
    match: /motor|bike|ducati|aprilia|ride|riding/i,
    lines: [
      'AFFIRMATIVE. There was a Ducati Monster he loved.',
      'These days he rides an Aprilia RS 660. You may',
      'have noticed the hero backgrounds. That was not',
      'an accident. Twisty roads > straight highways.',
    ],
  },
  {
    match: /basic|first (language|lang)|commodore|64|retro/i,
    lines: [
      'BASIC was his first programming language: line',
      'numbers, GOTO and all. This entire website is a',
      'love letter to that machine. 40 years later he',
      'ships TypeScript, but the READY. prompt remains.',
    ],
  },
  {
    match: /crypto|blockchain|wallet|web3|cardano|utxo|stablecoin/i,
    lines: [
      'DEEP IN IT. He built Begin Wallet, an open-source',
      'multi-chain crypto wallet, wrote the B58 Finance',
      'whitepaper, and now builds payment rails where AI',
      `agents pay each other in stablecoins.`,
      `>> ${L.beginwallet}`,
    ],
  },
  {
    match: /\bai\b|agent|llm|claude|gpt|machine learning|sokosumi|masumi/i,
    lines: [
      'HE BUILDS WITH IT DAILY. At Sokosumi he shipped a',
      'full chat interface for talking to specialized AI',
      'agents, on a marketplace where agents hire each',
      'other. Also reverse-engineers AI coding tools for',
      'fun. This terminal? Simulated. The real one costs',
      'tokens.',
    ],
  },
  {
    match: /security|cyber|jp ?morgan|bank|secret/i,
    lines: [
      '5+ years in cybersecurity at JP Morgan, Dublin.',
      'Tech lead on code-scanning tools used by devs',
      'across the entire bank: secrets detection, bulk',
      'scanning fleets, AWS infra as code. He has seen',
      'your hardcoded API keys. He forgives you.',
    ],
  },
  {
    match: /where|live|located|dublin|ireland|brazil/i,
    lines: [
      'LOCATION: Dublin, Ireland, by way of Brazil.',
      'Portuguese native, English fluent, TypeScript',
      'daily driver.',
    ],
  },
  {
    match: /experience|career|work|job|history|resume|cv/i,
    lines: [
      '20+ years across Brazil, Angola and Ireland.',
      'Currently: AI agent marketplace at UTXO.AG.',
      'Before: JP Morgan cybersecurity, Irish government',
      'apps, serverless platforms for iHeart Media and',
      'Walmart. Type WORK for the full LIST.',
    ],
  },
  {
    match: /hire|available|principal|open to|freelance/i,
    lines: [
      'CAREER GOAL: Principal Software Engineer.',
      'He likes hard problems, end-to-end ownership and',
      'small sharp teams. Reach him on LinkedIn or X.',
      'Type CONTACT for the channels.',
    ],
  },
  {
    match: /stack|language|typescript|python|java|node|react|next|golang|\bgo\b|rust/i,
    lines: [
      'POLYGLOT DETECTED. TypeScript and Python daily,',
      'plus Java, Go, Rust and 20 years of everything',
      'from ABAP to serverless. Type SKILLS for the',
      'full matrix.',
    ],
  },
  {
    match: /family|married|kids|age|old/i,
    lines: [
      'PERSONAL RECORDS PARTIALLY SEALED. Known facts:',
      'married, Brazilian, has been writing code longer',
      'than some of his colleagues have been alive.',
    ],
  },
  {
    match: /coffee|music|hobby|fun|free time/i,
    lines: [
      'OBSERVED IN THE WILD: coding outdoors with coffee',
      'and a view, riding motorcycles, building crypto',
      'wallets nobody asked for, and pixelating his own',
      'photos. A balanced life.',
    ],
  },
  {
    match: /hello|hi\b|hey|ola|olá|oi\b/i,
    lines: [
      'HELLO, HUMAN. I AM A VERY SMALL LANGUAGE MODEL:',
      'roughly 38911 BASIC bytes. Ask me about Francis,',
      'or type HELP to see what I can do.',
    ],
  },
];

export const AI_FALLBACK = [
  '?SYNTAX ERROR... JUST KIDDING. I am a simulated AI',
  'from 1984. My training data fits on one floppy.',
  'Ask about his WORK, SKILLS, PROJECTS, motorcycles,',
  'or type HELP for the menu.',
];
