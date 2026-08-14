import { Injectable } from '@nestjs/common';
import { Skill, SkillRelation } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AppCacheService } from '../common/cache/app-cache.service';
import { CacheKeys, CachePrefixes } from '../common/cache/cache-keys';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { CreateSkillRelationDto } from './dto/create-skill-relation.dto';
import { NotFoundAppException } from '../common/exceptions/app.exception';

const CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class SkillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AppCacheService,
  ) {}

  async findAll(): Promise<Skill[]> {
    const cached = await this.cache.get<Skill[]>(CacheKeys.skills);
    if (cached) {
      return cached;
    }
    const skills = await this.prisma.skill.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
    await this.cache.set(CacheKeys.skills, skills, CACHE_TTL_MS);
    return skills;
  }

  async findOne(id: string): Promise<Skill> {
    const skill = await this.prisma.skill.findUnique({ where: { id } });
    if (!skill) {
      throw new NotFoundAppException('Skill');
    }
    return skill;
  }

  async findRelations(id: string): Promise<SkillRelation[]> {
    await this.findOne(id);
    const [outgoing, incoming] = await Promise.all([
      this.prisma.skillRelation.findMany({ where: { skillId: id } }),
      this.prisma.skillRelation.findMany({ where: { relatedSkillId: id } }),
    ]);
    return [...outgoing, ...incoming];
  }

  async getMatrix(): Promise<{ skills: Skill[]; relations: SkillRelation[] }> {
    const cached = await this.cache.get<{ skills: Skill[]; relations: SkillRelation[] }>(CacheKeys.skillsMatrix);
    if (cached) {
      return cached;
    }
    const [skills, relations] = await Promise.all([
      this.prisma.skill.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
      this.prisma.skillRelation.findMany(),
    ]);
    const result = { skills, relations };
    await this.cache.set(CacheKeys.skillsMatrix, result, CACHE_TTL_MS);
    return result;
  }

  async create(dto: CreateSkillDto): Promise<Skill> {
    const created = await this.prisma.skill.create({ data: dto });
    await this.invalidateCache();
    return created;
  }

  async update(id: string, dto: UpdateSkillDto): Promise<Skill> {
    await this.findOne(id);
    const updated = await this.prisma.skill.update({ where: { id }, data: dto });
    await this.invalidateCache();
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.skill.delete({ where: { id } });
    await this.invalidateCache();
  }

  async addRelation(id: string, dto: CreateSkillRelationDto): Promise<SkillRelation> {
    await this.findOne(id);
    await this.findOne(dto.relatedSkillId);
    if (id === dto.relatedSkillId) {
      throw new NotFoundAppException('Skill cannot relate to itself');
    }
    const relation = await this.prisma.skillRelation.upsert({
      where: { skillId_relatedSkillId: { skillId: id, relatedSkillId: dto.relatedSkillId } },
      create: { skillId: id, relatedSkillId: dto.relatedSkillId, strength: dto.strength ?? 1 },
      update: { strength: dto.strength ?? 1 },
    });
    await this.invalidateCache();
    return relation;
  }

  async removeRelation(id: string, relatedSkillId: string): Promise<void> {
    await this.prisma.skillRelation.deleteMany({
      where: { skillId: id, relatedSkillId },
    });
    await this.invalidateCache();
  }

  private async invalidateCache(): Promise<void> {
    await Promise.all([
      this.cache.delByPrefix(CachePrefixes.skills),
      this.cache.del(CacheKeys.site),
    ]);
  }
}
