import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { HashingUtil } from '../../common/utils/hashing.util';

@Injectable()
export class RequestFingerprintService {
  compute(req: Request): string {
    const components = [
      req.ip ?? '',
      req.headers['user-agent'] ?? '',
      req.headers['accept-language'] ?? '',
    ];
    return HashingUtil.sha256(components.join('|'));
  }
}
