import { Injectable } from '@nestjs/common';
import { Prisma, ProjectStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppCacheService } from '../common/cache/app-cache.service';
import { CacheKeys, CachePrefixes } from '../common/cache/cache-keys';
import { paginate, Paginated } from '../common/dto/pagination-query.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { projectInclude, ProjectResponse, toProjectResponse } from './projects.mapper';
import { NotFoundAppException } from '../common/exceptions/app.exception';
import { slugify } from '../common/utils/slugify.util';

const CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AppCacheService,
  ) {}

  async findAllPublic(query: ProjectQueryDto): Promise<Paginated<ProjectResponse>> {
    const cacheKey = CacheKeys.projects(JSON.stringify(query));
    const cached = await this.cache.get<Paginated<ProjectResponse>>(cacheKey);
    if (cached) {
      return cached;
    }

    const where: Prisma.ProjectWhereInput = {
      status: ProjectStatus.PUBLISHED,
      ...(query.year ? { year: query.year } : {}),
      ...(query.featured !== undefined ? { featured: query.featured } : {}),
      ...(query.technology
        ? { technologies: { some: { technology: { name: { equals: query.technology, mode: 'insensitive' } } } } }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        include: projectInclude,
        orderBy: [{ sortOrder: 'asc' }, { year: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.project.count({ where }),
    ]);

    const result = paginate(rows.map(toProjectResponse), total, query.page, query.limit);
    await this.cache.set(cacheKey, result, CACHE_TTL_MS);
    return result;
  }

  /** Unpaginated published project list for the /api/site aggregate endpoint. */
  async findAllForSite(): Promise<ProjectResponse[]> {
    const rows = await this.prisma.project.findMany({
      where: { status: ProjectStatus.PUBLISHED },
      include: projectInclude,
      orderBy: [{ sortOrder: 'asc' }, { year: 'desc' }],
    });
    return rows.map(toProjectResponse);
  }

  async findFeatured(): Promise<ProjectResponse[]> {
    const cached = await this.cache.get<ProjectResponse[]>(CacheKeys.featuredProjects);
    if (cached) {
      return cached;
    }
    const rows = await this.prisma.project.findMany({
      where: { status: ProjectStatus.PUBLISHED, featured: true },
      include: projectInclude,
      orderBy: [{ sortOrder: 'asc' }, { year: 'desc' }],
    });
    const result = rows.map(toProjectResponse);
    await this.cache.set(CacheKeys.featuredProjects, result, CACHE_TTL_MS);
    return result;
  }

  async findBySlugPublic(slug: string): Promise<ProjectResponse> {
    const cacheKey = CacheKeys.projectBySlug(slug);
    const cached = await this.cache.get<ProjectResponse>(cacheKey);
    if (cached) {
      return cached;
    }
    const project = await this.prisma.project.findFirst({
      where: { slug, status: ProjectStatus.PUBLISHED },
      include: projectInclude,
    });
    if (!project) {
      throw new NotFoundAppException('Project');
    }
    const result = toProjectResponse(project);
    await this.cache.set(cacheKey, result, CACHE_TTL_MS);
    return result;
  }

  async findAllAdmin(query: ProjectQueryDto): Promise<Paginated<ProjectResponse>> {
    const where: Prisma.ProjectWhereInput = {
      ...(query.year ? { year: query.year } : {}),
      ...(query.featured !== undefined ? { featured: query.featured } : {}),
      ...(query.technology
        ? { technologies: { some: { technology: { name: { equals: query.technology, mode: 'insensitive' } } } } }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        include: projectInclude,
        orderBy: [{ sortOrder: 'asc' }, { year: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.project.count({ where }),
    ]);
    return paginate(rows.map(toProjectResponse), total, query.page, query.limit);
  }

  async findByIdAdmin(id: string): Promise<ProjectResponse> {
    const project = await this.prisma.project.findUnique({ where: { id }, include: projectInclude });
    if (!project) {
      throw new NotFoundAppException('Project');
    }
    return toProjectResponse(project);
  }

  async create(dto: CreateProjectDto): Promise<ProjectResponse> {
    const slug = await this.ensureUniqueSlug(dto.slug ?? slugify(dto.title));

    const created = await this.prisma.project.create({
      data: {
        slug,
        title: dto.title,
        subtitle: dto.subtitle,
        description: dto.description,
        year: dto.year,
        role: dto.role,
        client: dto.client,
        coverImage: dto.coverImage,
        liveUrl: dto.liveUrl,
        githubUrl: dto.githubUrl,
        caseStudyUrl: dto.caseStudyUrl,
        featured: dto.featured ?? false,
        sortOrder: dto.sortOrder ?? 0,
        status: dto.status ?? ProjectStatus.PUBLISHED,
        technologies: dto.technologies ? { create: await this.technologyCreates(dto.technologies) } : undefined,
        gallery: dto.galleryMediaIds ? { create: this.galleryCreates(dto.galleryMediaIds) } : undefined,
      },
      include: projectInclude,
    });

    await this.invalidateCache();
    return toProjectResponse(created);
  }

  async update(id: string, dto: UpdateProjectDto): Promise<ProjectResponse> {
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundAppException('Project');
    }

    const slug = dto.slug && dto.slug !== existing.slug ? await this.ensureUniqueSlug(dto.slug) : undefined;

    if (dto.technologies) {
      await this.prisma.projectTechnology.deleteMany({ where: { projectId: id } });
    }
    if (dto.galleryMediaIds) {
      await this.prisma.projectMedia.deleteMany({ where: { projectId: id } });
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        slug,
        title: dto.title,
        subtitle: dto.subtitle,
        description: dto.description,
        year: dto.year,
        role: dto.role,
        client: dto.client,
        coverImage: dto.coverImage,
        liveUrl: dto.liveUrl,
        githubUrl: dto.githubUrl,
        caseStudyUrl: dto.caseStudyUrl,
        featured: dto.featured,
        sortOrder: dto.sortOrder,
        status: dto.status,
        technologies: dto.technologies ? { create: await this.technologyCreates(dto.technologies) } : undefined,
        gallery: dto.galleryMediaIds ? { create: this.galleryCreates(dto.galleryMediaIds) } : undefined,
      },
      include: projectInclude,
    });

    await this.invalidateCache(existing.slug);
    return toProjectResponse(updated);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundAppException('Project');
    }
    await this.prisma.project.delete({ where: { id } });
    await this.invalidateCache(existing.slug);
  }

  private async ensureUniqueSlug(base: string): Promise<string> {
    let candidate = base;
    let suffix = 1;
    while (await this.prisma.project.findUnique({ where: { slug: candidate } })) {
      candidate = `${base}-${++suffix}`;
    }
    return candidate;
  }

  private async technologyCreates(names: string[]) {
    return Promise.all(
      names.map(async (name) => ({
        technology: {
          connectOrCreate: {
            where: { name },
            create: { name, slug: slugify(name) },
          },
        },
      })),
    );
  }

  private galleryCreates(mediaIds: string[]) {
    return mediaIds.map((mediaId, index) => ({
      mediaId,
      sortOrder: index,
      isCover: index === 0,
    }));
  }

  private async invalidateCache(previousSlug?: string): Promise<void> {
    await Promise.all([
      this.cache.delByPrefix(CachePrefixes.projects),
      this.cache.del(CacheKeys.featuredProjects),
      this.cache.del(CacheKeys.site),
      previousSlug ? this.cache.del(CacheKeys.projectBySlug(previousSlug)) : Promise.resolve(),
    ]);
  }
}
