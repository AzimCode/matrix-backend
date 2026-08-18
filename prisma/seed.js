/*
 * Demo content matching the SIGNAL design, so a fresh install looks like the
 * prototype instead of an empty page — and so the placeholder text can be
 * edited away one card at a time in the admin panel.
 *
 * Plain CommonJS on purpose. The production image runs `npm prune --omit=dev`,
 * which takes ts-node with it, so a TypeScript seed cannot run where this most
 * needs to: against the deployed database. `prisma` and `@prisma/client` are
 * both runtime dependencies, so this file runs anywhere the app itself does.
 *
 * Every write is an upsert against a fixed id with `update: {}`, which makes
 * this safe to run against a database that already has real content: rows that
 * exist are left exactly as they are, and only what is missing gets added.
 * That is also why it deliberately does not create an admin user — the app
 * bootstraps the first account itself from ADMIN_EMAIL / ADMIN_PASSWORD, with
 * the password policy enforced, rather than seeding a known default into a
 * database that may be reachable from the internet.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Must match PROFILE_SINGLETON_ID in src/profile/profile.service.ts
const PROFILE_SINGLETON_ID = 'profile-singleton';

/** The design states proficiency out of 100; the schema stores 1–5. */
const toLevel = (percent) => Math.min(5, Math.max(1, Math.round(percent / 20)));

const SKILLS = [
  // The first five carry the sort order that drives the About bars.
  { id: 'skill-react', name: 'React', category: 'Interface', percent: 96, sortOrder: 1 },
  { id: 'skill-typescript', name: 'TypeScript', category: 'Interface', percent: 92, sortOrder: 2 },
  { id: 'skill-framer-motion', name: 'Framer Motion', category: 'Motion', percent: 90, sortOrder: 3 },
  { id: 'skill-design-systems', name: 'Design Systems', category: 'Craft', percent: 88, sortOrder: 4 },
  { id: 'skill-webgl', name: 'WebGL / GLSL', category: 'Motion', percent: 74, sortOrder: 5 },
  { id: 'skill-tailwind', name: 'Tailwind', category: 'Interface', percent: 86, sortOrder: 6 },
  { id: 'skill-vite', name: 'Vite', category: 'Platform', percent: 80, sortOrder: 7 },
  { id: 'skill-node', name: 'Node', category: 'Platform', percent: 72, sortOrder: 8 },
  { id: 'skill-nestjs', name: 'NestJS', category: 'Platform', percent: 66, sortOrder: 9 },
  { id: 'skill-rive', name: 'Rive', category: 'Motion', percent: 58, sortOrder: 10 },
  { id: 'skill-figma', name: 'Figma', category: 'Craft', percent: 90, sortOrder: 11 },
  { id: 'skill-typography', name: 'Typography', category: 'Craft', percent: 84, sortOrder: 12 },
  { id: 'skill-accessibility', name: 'Accessibility', category: 'Craft', percent: 78, sortOrder: 13 },
];

/**
 * Stored once per pair. The design lists each relation from both ends, but the
 * site lights a relation in either direction, so storing both would only
 * duplicate rows in the panel.
 */
const RELATIONS = [
  ['skill-react', 'skill-typescript'],
  ['skill-react', 'skill-framer-motion'],
  ['skill-react', 'skill-tailwind'],
  ['skill-react', 'skill-vite'],
  ['skill-typescript', 'skill-node'],
  ['skill-typescript', 'skill-nestjs'],
  ['skill-typescript', 'skill-vite'],
  ['skill-framer-motion', 'skill-rive'],
  ['skill-framer-motion', 'skill-typography'],
  ['skill-framer-motion', 'skill-webgl'],
  ['skill-design-systems', 'skill-figma'],
  ['skill-design-systems', 'skill-typography'],
  ['skill-design-systems', 'skill-tailwind'],
  ['skill-design-systems', 'skill-accessibility'],
  ['skill-webgl', 'skill-rive'],
  ['skill-node', 'skill-nestjs'],
  ['skill-figma', 'skill-typography'],
];

const EXPERIENCE = [
  {
    id: 'exp-ostrom',
    company: 'Ostrom Financial',
    position: 'Principal Frontend Engineer',
    startDate: new Date('2023-01-01'),
    endDate: null,
    current: true,
    achievements: [
      'Rebuilt the trading console around a motion language; task completion up 31%.',
      'Shipped a 240-component design system consumed by six product teams.',
      'Cut first-paint on the dashboard from 3.4s to 900ms.',
    ],
    sortOrder: 0,
  },
  {
    id: 'exp-kaleidos',
    company: 'Kaleidos Studio',
    position: 'Senior Interface Engineer',
    startDate: new Date('2020-01-01'),
    endDate: new Date('2023-01-01'),
    current: false,
    achievements: [
      'Led frontend for eleven client sites, four of them awarded.',
      "Built the studio's WebGL transition kit, still in use.",
    ],
    sortOrder: 1,
  },
  {
    id: 'exp-northline',
    company: 'Northline Broadcast',
    position: 'Frontend Developer',
    startDate: new Date('2017-01-01'),
    endDate: new Date('2020-01-01'),
    current: false,
    achievements: [
      'Authored the on-air graphics motion spec adopted across two channels.',
      'Maintained a real-time results overlay for 40+ live events.',
    ],
    sortOrder: 2,
  },
];

const PROJECTS = [
  {
    id: 'project-ostrom-console',
    slug: 'ostrom-console',
    title: 'Ostrom Console',
    description: 'Real-time trading surface with a motion grammar for state change.',
    year: 2025,
    technologies: ['React', 'TypeScript', 'WebGL'],
    featured: true,
    sortOrder: 0,
  },
  {
    id: 'project-meridian-type',
    slug: 'meridian-type',
    title: 'Meridian Type',
    description: 'Variable-font specimen and licensing storefront.',
    year: 2024,
    technologies: ['Next', 'Framer Motion'],
    featured: false,
    sortOrder: 1,
  },
  {
    id: 'project-northline-overlay',
    slug: 'northline-overlay',
    title: 'Northline Overlay',
    description: 'Broadcast results graphics driven by a live feed.',
    year: 2023,
    technologies: ['Svelte', 'Rive'],
    featured: false,
    sortOrder: 2,
  },
  {
    id: 'project-field-notes',
    slug: 'field-notes',
    title: 'Field Notes',
    description: 'Offline-first research capture app for site surveys.',
    year: 2022,
    technologies: ['React Native', 'SQLite'],
    featured: false,
    sortOrder: 3,
  },
  {
    id: 'project-pulse',
    slug: 'pulse',
    title: 'Pulse',
    description: 'Open-source scroll-linked animation primitives.',
    year: 2021,
    technologies: ['TypeScript'],
    featured: false,
    sortOrder: 4,
  },
];

const EDUCATION = [
  {
    id: 'edu-rca',
    institution: 'Royal College of Art',
    degree: 'MA',
    field: 'Interaction Design',
    startDate: new Date('2015-09-01'),
    endDate: new Date('2017-06-30'),
    sortOrder: 0,
  },
  {
    id: 'edu-bristol',
    institution: 'University of Bristol',
    degree: 'BSc',
    field: 'Computer Science',
    startDate: new Date('2011-09-01'),
    endDate: new Date('2015-06-30'),
    sortOrder: 1,
  },
];

const CERTIFICATES = [
  { id: 'cert-motion-systems', title: 'Advanced Motion Systems', issuer: 'School of Motion', issueDate: new Date('2024-01-01'), sortOrder: 0 },
  { id: 'cert-cpacc', title: 'Accessibility Specialist (CPACC)', issuer: 'IAAP', issueDate: new Date('2022-01-01'), sortOrder: 1 },
  { id: 'cert-realtime-graphics', title: 'Real-Time Graphics', issuer: 'SIGGRAPH Course', issueDate: new Date('2021-01-01'), sortOrder: 2 },
];

async function main() {
  console.log('Seeding SIGNAL demo content (existing rows are left untouched)...');

  // ── Profile ───────────────────────────────────────────────────────────
  await prisma.profile.upsert({
    where: { id: PROFILE_SINGLETON_ID },
    update: {},
    create: {
      id: PROFILE_SINGLETON_ID,
      name: 'Mara Vieth',
      headline: 'Interface engineer, motion-first',
      location: 'London, United Kingdom',
      bio: 'I design and build the front half of products: the part people touch, and the part that has to feel inevitable. My work sits between engineering and choreography — typography that lands with weight, transitions that explain what just happened, interfaces that stay legible at speed.',
      email: 'hello@example.com',
      website: 'https://example.com',
      socialLinks: {
        github: 'https://github.com/example',
        linkedin: 'https://linkedin.com/in/example',
      },
      availability: 'AVAILABLE',
      systemStatus: 'ONLINE',
      accentColor: '#00ff41',
      profileVersion: 'profile v2.4 — signal.core',
      terminalMessages: [
        '> signal.core :: init',
        '> GET /site ............ 200 ok',
        '> GET /system/status ... 200 ok',
        '> accent channel locked #00FF41',
        '> render',
      ],
    },
  });

  // ── Experience ────────────────────────────────────────────────────────
  for (const job of EXPERIENCE) {
    await prisma.experience.upsert({
      where: { id: job.id },
      update: {},
      // No description or tech list in the design; both are optional on the
      // page and can be filled in from the panel.
      create: { ...job, description: '', technologies: [] },
    });
  }

  // ── Skills + the relation graph ───────────────────────────────────────
  for (const { percent, ...skill } of SKILLS) {
    await prisma.skill.upsert({
      where: { id: skill.id },
      update: {},
      create: { ...skill, level: toLevel(percent) },
    });
  }

  for (const [skillId, relatedSkillId] of RELATIONS) {
    await prisma.skillRelation.upsert({
      where: { skillId_relatedSkillId: { skillId, relatedSkillId } },
      update: {},
      create: { skillId, relatedSkillId, strength: 3 },
    });
  }

  // ── Projects ──────────────────────────────────────────────────────────
  const techIds = {};
  for (const name of [...new Set(PROJECTS.flatMap((p) => p.technologies))]) {
    const tech = await prisma.technology.upsert({
      where: { name },
      update: {},
      create: { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
    });
    techIds[name] = tech.id;
  }

  for (const project of PROJECTS) {
    const { technologies, ...rest } = project;
    await prisma.project.upsert({
      where: { id: project.id },
      update: {},
      create: {
        ...rest,
        status: 'PUBLISHED',
        technologies: { create: technologies.map((name) => ({ technologyId: techIds[name] })) },
      },
    });
  }

  // ── Education & certificates ──────────────────────────────────────────
  for (const item of EDUCATION) {
    await prisma.education.upsert({ where: { id: item.id }, update: {}, create: item });
  }

  for (const item of CERTIFICATES) {
    await prisma.certificate.upsert({ where: { id: item.id }, update: {}, create: item });
  }

  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
