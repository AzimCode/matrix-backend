/** Central registry of Redis cache keys used for public, rarely-changing endpoints. */
export const CacheKeys = {
  profile: 'cache:profile',
  experience: 'cache:experience',
  projects: (query: string) => `cache:projects:${query}`,
  projectBySlug: (slug: string) => `cache:project:${slug}`,
  featuredProjects: 'cache:projects:featured',
  skillsMatrix: 'cache:skills:matrix',
  skills: 'cache:skills',
  education: 'cache:education',
  certificates: 'cache:certificates',
  resume: 'cache:resume:active',
  site: 'cache:site',
  systemStatus: 'cache:system-status',
} as const;

export const CachePrefixes = {
  projects: 'cache:projects',
  skills: 'cache:skills',
} as const;
