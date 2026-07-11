import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { IPushProvider } from '../interfaces/notification.interface';
import { FirebaseProvider } from './firebase.provider';

@Injectable()
export class PushFactory {
  constructor(private readonly configService: AppConfigService) {}

  create(): IPushProvider {
    const { firebase } = this.configService.push;

    return new FirebaseProvider({
      projectId: firebase.projectId,
      clientEmail: firebase.clientEmail,
      privateKey: firebase.privateKey,
    });
  }
}
