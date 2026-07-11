import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { School, Prisma } from '@prisma/client';

@Injectable()
export class TenancyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  // ── Resolve tenant ─────────────────────────────────────────────────────────

  async resolveBySlugOrId(identifier: string): Promise<School | null> {
    return this.prisma.school.findFirst({
      where: {
        OR: [{ slug: identifier }, { id: identifier }, { domain: identifier }],
        deletedAt: null,
      },
    });
  }

  async resolveById(id: string): Promise<School> {
    const school = await this.prisma.school.findFirst({
      where: { id, deletedAt: null },
    });
    if (!school) throw new NotFoundException(`School ${id} not found`);
    return school;
  }

  // ── Scoped query helper ────────────────────────────────────────────────────
  // Usage: const where = tenancyService.scopeWhere({ name: 'John' }, schoolId);

  scopeWhere<T extends Record<string, unknown>>(
    where: T,
    schoolId: string | null,
  ): T & { schoolId?: string } {
    if (!schoolId) return where;
    return { ...where, schoolId };
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  async create(data: {
    name: string;
    slug: string;
    domain?: string;
    logoUrl?: string;
    metadata?: Prisma.InputJsonValue;
  }): Promise<School> {
    const existing = await this.prisma.school.findFirst({
      where: {
        OR: [
          { slug: data.slug },
          ...(data.domain ? [{ domain: data.domain }] : []),
        ],
      },
    });

    if (existing) {
      throw new ConflictException('A school with this slug or domain already exists');
    }

    const school = await this.prisma.school.create({ data });
    this.logger.log(`School created: ${school.slug}`, 'TenancyService');
    return school;
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: Prisma.SchoolWhereInput = { deletedAt: null };

    const [schools, total] = await this.prisma.$transaction([
      this.prisma.school.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.school.count({ where }),
    ]);

    return {
      data: schools,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(
    id: string,
    data: Partial<Pick<School, 'name' | 'domain' | 'logoUrl' | 'isActive'>>,
  ): Promise<School> {
    await this.resolveById(id);
    return this.prisma.school.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.resolveById(id);
    await this.prisma.school.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.logger.log(`School soft-deleted: ${id}`, 'TenancyService');
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  async getUserCount(schoolId: string): Promise<number> {
    return this.prisma.user.count({
      where: { schoolId, deletedAt: null },
    });
  }
}
