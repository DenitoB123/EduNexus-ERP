import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { timingSafeEqual } from 'crypto';
import { AppConfigService } from '../../config/app-config.service';
import { IHashService } from '../interfaces/security.interfaces';

@Injectable()
export class HashService implements IHashService {
  constructor(private readonly configService: AppConfigService) {}

  async hash(value: string): Promise<string> {
    const rounds = this.configService.security.bcryptRounds;
    return bcrypt.hash(value, rounds);
  }

  async compare(value: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(value, hashed);
  }

  safeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  }
}
