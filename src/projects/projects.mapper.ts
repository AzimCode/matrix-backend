import { Media, Project, ProjectMedia, ProjectTechnology, Technology } from '@prisma/client';

type ProjectWithRelations = Project & {
  technologies: (ProjectTechnology & { technology: Technology })[];
  gallery: (ProjectMedia & { media: Media })[];
};

export interface ProjectResponse extends Omit<Project, never> {
  technologies: string[];
  gallery: { id: string; url: string; width: number | null; height: number | null; isCover: boolean }[];
}

export function toProjectResponse(project: ProjectWithRelations): ProjectResponse {
  return {
    ...project,
    technologies: project.technologies.map((t) => t.technology.name),
    gallery: project.gallery
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((g) => ({
        id: g.media.id,
        url: g.media.url,
        width: g.media.width,
        height: g.media.height,
        isCover: g.isCover,
      })),
  };
}

export const projectInclude = {
  technologies: { include: { technology: true } },
  gallery: { include: { media: true }, orderBy: { sortOrder: 'asc' as const } },
};
