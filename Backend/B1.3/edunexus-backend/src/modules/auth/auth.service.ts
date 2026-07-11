import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../database/prisma.service';
import { AppConfigService } from '../../config/config.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload, RequestUser } from './strategies/jwt.strategy';
import { UserStatus } from '@prisma/client';
import { PasswordService } from '../security/password.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { EventBusService, SYSTEM_EVENTS } from '../event-bus/event-bus.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthResponse {
  user: Omit<RequestUser, 'roles'> & { roles: string[] };
  tokens: AuthTokens;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: AppConfigService,
    private readonly logger: AppLoggerService,
    private readonly passwordService: PasswordService,
    private readonly auditLogService: AuditLogService,
    private readonly eventBus: EventBusService,
  ) {}

  // ── Register ───────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        status: UserStatus.ACTIVE,
        ...(dto.schoolId && { schoolId: dto.schoolId }),
      },
      include: {
        roles: { include: { role: true } },
      },
    });

    this.logger.log(`User registered: ${user.email}`, 'AuthService');

    await this.auditLogService.record({
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      userId: user.id,
      actorType: 'user',
      schoolId: user.schoolId,
    });

    await this.eventBus.publish({
      name: SYSTEM_EVENTS.USER_CREATED,
      payload: { userId: user.id, email: user.email, schoolId: user.schoolId },
      schoolId: user.schoolId,
    });

    const roles = user.roles.map((ur) => ur.role.name);
    const tokens = await this.generateTokens(user.id, user.email, user.schoolId, roles);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        schoolId: user.schoolId,
        roles,
      },
      tokens,
    };
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { roles: { include: { role: true } } },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.deletedAt) {
      throw new UnauthorizedException('Account does not exist');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account is suspended');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException('Account is inactive');
    }

    const passwordValid = await this.passwordService.verify(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const roles = user.roles.map((ur) => ur.role.name);
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.schoolId,
      roles,
      ipAddress,
      userAgent,
    );

    this.logger.log(`User logged in: ${user.email}`, 'AuthService');

    await this.auditLogService.recordAuthEvent({
      action: 'LOGIN',
      userId: user.id,
      ipAddress,
      userAgent,
      schoolId: user.schoolId,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        schoolId: user.schoolId,
        roles,
      },
      tokens,
    };
  }

  // ── Refresh token ──────────────────────────────────────────────────────────

  async refreshTokens(token: string): Promise<AuthTokens> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { include: { roles: { include: { role: true } } } } },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const roles = stored.user.roles.map((ur) => ur.role.name);
    return this.generateTokens(
      stored.user.id,
      stored.user.email,
      stored.user.schoolId,
      roles,
    );
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, token: refreshToken, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await this.auditLogService.recordAuthEvent({
      action: 'LOGOUT',
      userId,
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async generateTokens(
    userId: string,
    email: string,
    schoolId: string | null,
    roles: string[],
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email, schoolId, roles };

    const accessToken = this.jwtService.sign(payload);

    const rawRefresh = uuidv4();
    const refreshExpiresIn = this.config.jwtRefreshExpiresIn;
    const expiresAt = this.parseExpiry(refreshExpiresIn);

    await this.prisma.refreshToken.create({
      data: {
        token: rawRefresh,
        userId,
        expiresAt,
        ...(ipAddress && { ipAddress }),
        ...(userAgent && { userAgent }),
      },
    });

    return {
      accessToken,
      refreshToken: rawRefresh,
      expiresIn: this.config.jwtExpiresIn,
    };
  }

  private parseExpiry(expiry: string): Date {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);
    const now = new Date();
    switch (unit) {
      case 'd':
        now.setDate(now.getDate() + value);
        break;
      case 'h':
        now.setHours(now.getHours() + value);
        break;
      case 'm':
        now.setMinutes(now.getMinutes() + value);
        break;
      default:
        now.setDate(now.getDate() + 7);
    }
    return now;
  }
}
