-- Demo content from the SIGNAL design, so the live site shows a filled-in
-- portfolio that can then be edited card by card in the admin panel.
--
-- This lives in a migration rather than the seed script because the seed has
-- no way to reach the deployed database: Railway runs a single pre-deploy
-- command and the production image drops the dev toolchain. `migrate deploy`
-- already runs there on every deploy, exactly once per migration, which is
-- also the right semantics here — a row deleted in the panel must stay
-- deleted, and a seed re-run would bring it back.
--
-- Every insert is ON CONFLICT DO NOTHING, so nothing already in the database
-- is touched or overwritten. The profile is deliberately left alone: whoever
-- owns this deployment has their own name, bio and links there already.

-- ── Skills ──────────────────────────────────────────────────────────────
-- The design states proficiency out of 100; the schema stores 1-5, so each
-- percentage is rounded to its fifth here (96 -> 5, 74 -> 4, 58 -> 3).
INSERT INTO "skills" ("id", "name", "category", "level", "sortOrder", "updatedAt") VALUES
  ('skill-react',          'React',          'Interface', 5, 1,  CURRENT_TIMESTAMP),
  ('skill-typescript',     'TypeScript',     'Interface', 5, 2,  CURRENT_TIMESTAMP),
  ('skill-framer-motion',  'Framer Motion',  'Motion',    5, 3,  CURRENT_TIMESTAMP),
  ('skill-design-systems', 'Design Systems', 'Craft',     4, 4,  CURRENT_TIMESTAMP),
  ('skill-webgl',          'WebGL / GLSL',   'Motion',    4, 5,  CURRENT_TIMESTAMP),
  ('skill-tailwind',       'Tailwind',       'Interface', 4, 6,  CURRENT_TIMESTAMP),
  ('skill-vite',           'Vite',           'Platform',  4, 7,  CURRENT_TIMESTAMP),
  ('skill-node',           'Node',           'Platform',  4, 8,  CURRENT_TIMESTAMP),
  ('skill-nestjs',         'NestJS',         'Platform',  3, 9,  CURRENT_TIMESTAMP),
  ('skill-rive',           'Rive',           'Motion',    3, 10, CURRENT_TIMESTAMP),
  ('skill-figma',          'Figma',          'Craft',     5, 11, CURRENT_TIMESTAMP),
  ('skill-typography',     'Typography',     'Craft',     4, 12, CURRENT_TIMESTAMP),
  ('skill-accessibility',  'Accessibility',  'Craft',     4, 13, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- ── Skill relations ─────────────────────────────────────────────────────
-- Stored once per pair: the site lights a relation from either end, so the
-- mirrored row would only clutter the panel. Guarded by the joins so a skill
-- that was skipped above (a name already taken) cannot break the foreign key.
INSERT INTO "skill_relations" ("skillId", "relatedSkillId", "strength")
SELECT a.id, b.id, 3
FROM (VALUES
  ('skill-react',          'skill-typescript'),
  ('skill-react',          'skill-framer-motion'),
  ('skill-react',          'skill-tailwind'),
  ('skill-react',          'skill-vite'),
  ('skill-typescript',     'skill-node'),
  ('skill-typescript',     'skill-nestjs'),
  ('skill-typescript',     'skill-vite'),
  ('skill-framer-motion',  'skill-rive'),
  ('skill-framer-motion',  'skill-typography'),
  ('skill-framer-motion',  'skill-webgl'),
  ('skill-design-systems', 'skill-figma'),
  ('skill-design-systems', 'skill-typography'),
  ('skill-design-systems', 'skill-tailwind'),
  ('skill-design-systems', 'skill-accessibility'),
  ('skill-webgl',          'skill-rive'),
  ('skill-node',           'skill-nestjs'),
  ('skill-figma',          'skill-typography')
) AS v(source, target)
JOIN "skills" a ON a.id = v.source
JOIN "skills" b ON b.id = v.target
ON CONFLICT DO NOTHING;

-- ── Experience ──────────────────────────────────────────────────────────
-- The design gives no per-role description or tech list; both are optional on
-- the page and can be filled in from the panel.
INSERT INTO "experience" ("id", "company", "position", "startDate", "endDate", "current", "description", "achievements", "technologies", "sortOrder", "updatedAt") VALUES
  ('exp-ostrom', 'Ostrom Financial', 'Principal Frontend Engineer', '2023-01-01', NULL, true, '',
   ARRAY[
     'Rebuilt the trading console around a motion language; task completion up 31%.',
     'Shipped a 240-component design system consumed by six product teams.',
     'Cut first-paint on the dashboard from 3.4s to 900ms.'
   ], ARRAY[]::TEXT[], 0, CURRENT_TIMESTAMP),
  ('exp-kaleidos', 'Kaleidos Studio', 'Senior Interface Engineer', '2020-01-01', '2023-01-01', false, '',
   ARRAY[
     'Led frontend for eleven client sites, four of them awarded.',
     'Built the studio''s WebGL transition kit, still in use.'
   ], ARRAY[]::TEXT[], 1, CURRENT_TIMESTAMP),
  ('exp-northline', 'Northline Broadcast', 'Frontend Developer', '2017-01-01', '2020-01-01', false, '',
   ARRAY[
     'Authored the on-air graphics motion spec adopted across two channels.',
     'Maintained a real-time results overlay for 40+ live events.'
   ], ARRAY[]::TEXT[], 2, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- ── Technologies ────────────────────────────────────────────────────────
INSERT INTO "technologies" ("id", "name", "slug") VALUES
  ('tech-react',        'React',        'react'),
  ('tech-typescript',   'TypeScript',   'typescript'),
  ('tech-webgl',        'WebGL',        'webgl'),
  ('tech-next',         'Next',         'next'),
  ('tech-framer-motion','Framer Motion','framer-motion'),
  ('tech-svelte',       'Svelte',       'svelte'),
  ('tech-rive',         'Rive',         'rive'),
  ('tech-react-native', 'React Native', 'react-native'),
  ('tech-sqlite',       'SQLite',       'sqlite')
ON CONFLICT DO NOTHING;

-- ── Projects ────────────────────────────────────────────────────────────
-- The design carries no year and the column is required, so these are the
-- descending years implied by the ordering.
INSERT INTO "projects" ("id", "slug", "title", "description", "year", "featured", "sortOrder", "status", "updatedAt") VALUES
  ('project-ostrom-console',    'ostrom-console',    'Ostrom Console',    'Real-time trading surface with a motion grammar for state change.', 2025, true,  0, 'PUBLISHED'::"ProjectStatus", CURRENT_TIMESTAMP),
  ('project-meridian-type',     'meridian-type',     'Meridian Type',     'Variable-font specimen and licensing storefront.',                  2024, false, 1, 'PUBLISHED'::"ProjectStatus", CURRENT_TIMESTAMP),
  ('project-northline-overlay', 'northline-overlay', 'Northline Overlay', 'Broadcast results graphics driven by a live feed.',                 2023, false, 2, 'PUBLISHED'::"ProjectStatus", CURRENT_TIMESTAMP),
  ('project-field-notes',       'field-notes',       'Field Notes',       'Offline-first research capture app for site surveys.',              2022, false, 3, 'PUBLISHED'::"ProjectStatus", CURRENT_TIMESTAMP),
  ('project-pulse',             'pulse',             'Pulse',             'Open-source scroll-linked animation primitives.',                   2021, false, 4, 'PUBLISHED'::"ProjectStatus", CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Matched by technology name rather than id, so this still links correctly if
-- a technology row already existed under an id of its own.
INSERT INTO "project_technologies" ("projectId", "technologyId")
SELECT p.id, t.id
FROM (VALUES
  ('project-ostrom-console',    'React'),
  ('project-ostrom-console',    'TypeScript'),
  ('project-ostrom-console',    'WebGL'),
  ('project-meridian-type',     'Next'),
  ('project-meridian-type',     'Framer Motion'),
  ('project-northline-overlay', 'Svelte'),
  ('project-northline-overlay', 'Rive'),
  ('project-field-notes',       'React Native'),
  ('project-field-notes',       'SQLite'),
  ('project-pulse',             'TypeScript')
) AS v(project, technology)
JOIN "projects" p ON p.id = v.project
JOIN "technologies" t ON t.name = v.technology
ON CONFLICT DO NOTHING;

-- ── Education ───────────────────────────────────────────────────────────
INSERT INTO "education" ("id", "institution", "degree", "field", "startDate", "endDate", "sortOrder", "updatedAt") VALUES
  ('edu-rca',     'Royal College of Art',   'MA',  'Interaction Design', '2015-09-01', '2017-06-30', 0, CURRENT_TIMESTAMP),
  ('edu-bristol', 'University of Bristol',  'BSc', 'Computer Science',   '2011-09-01', '2015-06-30', 1, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- ── Certificates ────────────────────────────────────────────────────────
INSERT INTO "certificates" ("id", "title", "issuer", "issueDate", "sortOrder", "updatedAt") VALUES
  ('cert-motion-systems',     'Advanced Motion Systems',          'School of Motion', '2024-01-01', 0, CURRENT_TIMESTAMP),
  ('cert-cpacc',              'Accessibility Specialist (CPACC)', 'IAAP',             '2022-01-01', 1, CURRENT_TIMESTAMP),
  ('cert-realtime-graphics',  'Real-Time Graphics',               'SIGGRAPH Course',  '2021-01-01', 2, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
