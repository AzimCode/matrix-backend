import { PrismaClient, AdminRole, ProjectStatus, AvailabilityStatus, SystemStatusValue } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

// Must match PROFILE_SINGLETON_ID in src/profile/profile.service.ts
const PROFILE_SINGLETON_ID = 'profile-singleton';

async function main(): Promise<void> {
  console.log('Seeding THE MATRIX — SYSTEM PROFILE demo data...');

  // ── Admin user ────────────────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@matrix.dev';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const passwordHash = await argon2.hash(adminPassword, { type: argon2.argon2id });

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash, role: AdminRole.ADMIN },
  });
  console.log(`Admin user ready: ${adminEmail} / ${adminPassword} (change this immediately)`);

  // ── Profile ───────────────────────────────────────────────────────────
  await prisma.profile.upsert({
    where: { id: PROFILE_SINGLETON_ID },
    update: {},
    create: {
      id: PROFILE_SINGLETON_ID,
      name: 'Alexander Ivanov',
      headline: 'Product Designer / Creative Developer',
      location: 'Tashkent, Uzbekistan',
      bio: 'I build interfaces that feel alive — part interaction design, part systems engineering, part digital rebellion. Ten years of turning "what if" into shipped product.',
      avatarUrl: null,
      email: 'contact@alexivanov.dev',
      phone: '+998901234567',
      website: 'https://alexivanov.dev',
      socialLinks: {
        linkedin: 'https://linkedin.com/in/alexivanov',
        github: 'https://github.com/alexivanov',
        telegram: 'https://t.me/alexivanov',
      },
      availability: AvailabilityStatus.AVAILABLE,
      systemStatus: SystemStatusValue.ONLINE,
      accentColor: '#00ff41',
      profileVersion: '2.7.1',
      terminalMessages: [
        'INITIALIZING PROFILE...',
        'DECRYPTING IDENTITY MATRIX...',
        'IDENTITY FOUND',
        'ACCESS GRANTED',
        'WELCOME BACK, OPERATOR',
      ],
    },
  });

  // ── Experience ────────────────────────────────────────────────────────
  await prisma.experience.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'exp-nebula',
        company: 'Nebula Systems',
        position: 'Lead Product Designer',
        location: 'Remote',
        startDate: new Date('2023-02-01'),
        endDate: null,
        current: true,
        description: 'Leading design for a real-time collaboration platform used by 40k+ teams.',
        achievements: [
          'Cut onboarding time by 63% through a redesigned first-run flow',
          'Built and shipped a scalable design system adopted across 6 product squads',
        ],
        technologies: ['Figma', 'React', 'WebGL', 'Framer Motion'],
        sortOrder: 0,
      },
      {
        id: 'exp-obsidian',
        company: 'Obsidian Labs',
        position: 'Senior Creative Developer',
        location: 'Berlin, Germany',
        startDate: new Date('2020-06-01'),
        endDate: new Date('2023-01-15'),
        current: false,
        description: 'Built award-winning interactive experiences for clients across fintech and entertainment.',
        achievements: [
          'Led a 3D product configurator that increased conversion by 28%',
          'Mentored a team of 4 junior developers',
        ],
        technologies: ['Three.js', 'TypeScript', 'GLSL', 'Node.js'],
        sortOrder: 1,
      },
      {
        id: 'exp-freelance',
        company: 'Independent',
        position: 'Freelance Designer & Developer',
        location: 'Remote',
        startDate: new Date('2017-03-01'),
        endDate: new Date('2020-05-30'),
        current: false,
        description: 'Designed and built digital products for startups across 12 countries.',
        achievements: ['Delivered 30+ projects with a 100% on-time record'],
        technologies: ['Vue.js', 'Sketch', 'WordPress'],
        sortOrder: 2,
      },
    ],
  });

  // ── Skills (the Matrix) ───────────────────────────────────────────────
  const skillDefs = [
    { id: 'skill-ux', name: 'UX', category: 'DESIGN', level: 5, years: 9, color: '#00ff41', sortOrder: 0 },
    { id: 'skill-ui', name: 'UI', category: 'DESIGN', level: 5, years: 9, color: '#00ff41', sortOrder: 1 },
    { id: 'skill-3d', name: '3D', category: 'CREATIVE', level: 4, years: 5, color: '#39ff14', sortOrder: 2 },
    { id: 'skill-code', name: 'CODE', category: 'ENGINEERING', level: 5, years: 10, color: '#00cc33', sortOrder: 3 },
    { id: 'skill-ai', name: 'AI', category: 'ENGINEERING', level: 3, years: 2, color: '#00ff88', sortOrder: 4 },
    { id: 'skill-motion', name: 'MOTION', category: 'CREATIVE', level: 4, years: 6, color: '#39ff14', sortOrder: 5 },
    { id: 'skill-webgl', name: 'WEBGL', category: 'ENGINEERING', level: 4, years: 4, color: '#00cc33', sortOrder: 6 },
    { id: 'skill-react', name: 'REACT', category: 'ENGINEERING', level: 5, years: 7, color: '#00cc33', sortOrder: 7 },
    { id: 'skill-figma', name: 'FIGMA', category: 'DESIGN', level: 5, years: 8, color: '#00ff41', sortOrder: 8 },
  ];
  for (const skill of skillDefs) {
    await prisma.skill.upsert({ where: { id: skill.id }, update: {}, create: skill });
  }

  const relations: [string, string, number][] = [
    ['skill-ux', 'skill-ui', 5],
    ['skill-ui', 'skill-figma', 5],
    ['skill-code', 'skill-react', 5],
    ['skill-react', 'skill-webgl', 3],
    ['skill-webgl', 'skill-3d', 4],
    ['skill-motion', 'skill-3d', 4],
    ['skill-motion', 'skill-ui', 3],
    ['skill-code', 'skill-ai', 3],
    ['skill-code', 'skill-webgl', 4],
  ];
  for (const [skillId, relatedSkillId, strength] of relations) {
    await prisma.skillRelation.upsert({
      where: { skillId_relatedSkillId: { skillId, relatedSkillId } },
      update: { strength },
      create: { skillId, relatedSkillId, strength },
    });
  }

  // ── Projects ──────────────────────────────────────────────────────────
  const techNames = ['React', 'TypeScript', 'Three.js', 'WebGL', 'Figma', 'Node.js', 'PostgreSQL', 'Framer Motion'];
  const technologies: Record<string, { id: string }> = {};
  for (const name of techNames) {
    technologies[name] = await prisma.technology.upsert({
      where: { name },
      update: {},
      create: { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
    });
  }

  const projectDefs = [
    {
      id: 'project-nexus',
      slug: 'nexus-collaboration-platform',
      title: 'Nexus',
      subtitle: 'Real-time collaboration platform',
      description:
        'A ground-up redesign of a real-time collaboration platform, from information architecture to a custom WebGL canvas renderer.',
      year: 2025,
      role: 'Lead Product Designer',
      client: 'Nebula Systems',
      technologies: ['React', 'TypeScript', 'WebGL', 'Node.js'],
      featured: true,
      sortOrder: 0,
    },
    {
      id: 'project-configurator',
      slug: '3d-product-configurator',
      title: '3D Configurator',
      subtitle: 'Interactive product visualization',
      description:
        'A photorealistic 3D product configurator built with Three.js, driving a 28% lift in checkout conversion.',
      year: 2023,
      role: 'Creative Developer',
      client: 'Obsidian Labs',
      technologies: ['Three.js', 'TypeScript', 'React'],
      featured: true,
      sortOrder: 1,
    },
    {
      id: 'project-matrix-cv',
      slug: 'the-matrix-system-profile',
      title: 'THE MATRIX — SYSTEM PROFILE',
      subtitle: 'This very site',
      description:
        'An interactive personal CV/portfolio with a Matrix aesthetic — glitch effects, scroll-driven 3D, and a fully-typed NestJS backend.',
      year: 2026,
      role: 'Designer & Full-stack Developer',
      client: 'Self-initiated',
      technologies: ['React', 'TypeScript', 'PostgreSQL', 'Framer Motion'],
      featured: true,
      sortOrder: 2,
    },
  ];

  for (const p of projectDefs) {
    await prisma.project.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        slug: p.slug,
        title: p.title,
        subtitle: p.subtitle,
        description: p.description,
        year: p.year,
        role: p.role,
        client: p.client,
        featured: p.featured,
        sortOrder: p.sortOrder,
        status: ProjectStatus.PUBLISHED,
        technologies: {
          create: p.technologies.map((name) => ({ technologyId: technologies[name].id })),
        },
      },
    });
  }

  // ── Education ─────────────────────────────────────────────────────────
  await prisma.education.upsert({
    where: { id: 'edu-1' },
    update: {},
    create: {
      id: 'edu-1',
      institution: 'National University of Uzbekistan',
      degree: 'B.Sc. Computer Science',
      field: 'Human-Computer Interaction',
      startDate: new Date('2013-09-01'),
      endDate: new Date('2017-06-30'),
      description: 'Focused on interaction design and real-time graphics.',
      sortOrder: 0,
    },
  });

  // ── Certificates ──────────────────────────────────────────────────────
  await prisma.certificate.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'cert-1',
        title: 'Advanced React Patterns',
        issuer: 'Frontend Masters',
        issueDate: new Date('2022-04-10'),
        credentialUrl: 'https://frontendmasters.com/certificates/example',
        sortOrder: 0,
      },
      {
        id: 'cert-2',
        title: 'WebGL & Three.js Journey',
        issuer: 'Three.js Journey',
        issueDate: new Date('2021-11-02'),
        credentialUrl: 'https://threejs-journey.com/certificates/example',
        sortOrder: 1,
      },
    ],
  });

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
