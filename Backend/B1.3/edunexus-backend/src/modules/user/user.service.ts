import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AUTH_CONSTANTS } from '../auth/auth.constants';
import { User, Prisma } from '@prisma/client';

export type SafeUser = Omit<User, 'passwordHash'>;

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  status: true,
  schoolId: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  passwordHash: false,
  roles: {
    include: {
      role: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(
      dto.password,
      AUTH_CONSTANTS.BCRYPT_ROUNDS,
    );

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        ...(dto.schoolId && { schoolId: dto.schoolId }),
        ...(dto.status && { status: dto.status }),
        ...(dto.roleIds?.length && {
          roles: {
            create: dto.roleIds.map((roleId) => ({ roleId })),
          },
        }),
      },
      select: USER_SELECT,
    });

    this.logger.log(`User created: ${user.email}`, 'UserService');
    return user;
  }

  // ── Find by ID ─────────────────────────────────────────────────────────────

  async findById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: USER_SELECT,
    });

    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  // ── Find by email ──────────────────────────────────────────────────────────

  async findByEmail(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: USER_SELECT,
    });

    if (!user) throw new NotFoundException(`User with email ${email} not found`);
    return user;
  }

  // ── Find all (scoped to school) ────────────────────────────────────────────

  async findAll(schoolId?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(schoolId && { schoolId }),
    };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateUserDto) {
    await this.findById(id);

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        ...(dto.status && { status: dto.status }),
        ...(dto.roleIds && {
          roles: {
            deleteMany: {},
            create: dto.roleIds.map((roleId) => ({ roleId })),
          },
        }),
      },
      select: USER_SELECT,
    });

    this.logger.log(`User updated: ${id}`, 'UserService');
    return updated;
  }

  // ── Soft delete ────────────────────────────────────────────────────────────

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.logger.log(`User soft-deleted: ${id}`, 'UserService');
  }

  // ── Assign roles ───────────────────────────────────────────────────────────

  async assignRoles(userId: string, roleIds: string[]) {
    await this.findById(userId);

    await this.prisma.userRole.deleteMany({ where: { userId } });

    return this.prisma.userRole.createMany({
      data: roleIds.map((roleId) => ({ userId, roleId })),
      skipDuplicates: true,
    });
  }
}
