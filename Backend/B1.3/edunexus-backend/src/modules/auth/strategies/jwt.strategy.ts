import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../database/prisma.service';
import { AppConfigService } from '../../../config/config.service';
import { AUTH_CONSTANTS } from '../auth.constants';
import { User, UserStatus } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  schoolId: string | null;
  roles: string[];
  iat?: number;
  exp?: number;
}

export interface RequestUser {
  id: string;
  email: string;
  schoolId: string | null;
  roles: string[];
  firstName: string;
  lastName: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(
  Strategy,
  AUTH_CONSTANTS.JWT_STRATEGY,
) {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account is suspended');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException('Account is inactive');
    }

    if (user.deletedAt) {
      throw new UnauthorizedException('Account has been deleted');
    }

    return {
      id: user.id,
      email: user.email,
      schoolId: user.schoolId,
      roles: user.roles.map((ur) => ur.role.name),
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}
