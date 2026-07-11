import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Role checks ────────────────────────────────────────────────────────────

  async getUserRoles(userId: string): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return userRoles.map((ur) => ur.role.name);
  }

  async userHasRole(userId: string, roleName: string): Promise<boolean> {
    const count = await this.prisma.userRole.count({
      where: {
        userId,
        role: { name: roleName },
      },
    });
    return count > 0;
  }

  async userHasAnyRole(userId: string, roleNames: string[]): Promise<boolean> {
    const count = await this.prisma.userRole.count({
      where: {
        userId,
        role: { name: { in: roleNames } },
      },
    });
    return count > 0;
  }

  // ── Permission checks ──────────────────────────────────────────────────────

  async getUserPermissions(
    userId: string,
  ): Promise<{ action: string; subject: string }[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    const permissions = userRoles.flatMap((ur) =>
      ur.role.permissions.map((rp) => ({
        action: rp.permission.action,
        subject: rp.permission.subject,
      })),
    );

    return Array.from(
      new Map(permissions.map((p) => [`${p.action}:${p.subject}`, p])).values(),
    );
  }

  async userHasPermission(
    userId: string,
    action: string,
    subject: string,
  ): Promise<boolean> {
    const count = await this.prisma.userRole.count({
      where: {
        userId,
        role: {
          permissions: {
            some: {
              permission: { action, subject },
            },
          },
        },
      },
    });
    return count > 0;
  }

  // ── Role management ────────────────────────────────────────────────────────

  async createRole(
    name: string,
    description?: string,
    schoolId?: string,
    isSystem = false,
  ) {
    return this.prisma.role.create({
      data: { name, description, schoolId, isSystem },
    });
  }

  async assignPermissionToRole(roleId: string, permissionId: string) {
    return this.prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      update: {},
      create: { roleId, permissionId },
    });
  }

  async revokePermissionFromRole(roleId: string, permissionId: string) {
    return this.prisma.rolePermission.deleteMany({
      where: { roleId, permissionId },
    });
  }

  async createPermission(action: string, subject: string, description?: string) {
    return this.prisma.permission.upsert({
      where: { action_subject: { action, subject } },
      update: { description },
      create: { action, subject, description },
    });
  }
}
