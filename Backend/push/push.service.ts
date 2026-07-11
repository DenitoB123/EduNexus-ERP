import { Injectable, OnModuleInit } from '@nestjs/common';
import { PushFactory } from './push.factory';
import { DeviceRegistrationService } from './device-registration.service';
import { IPushProvider, SendPushInput } from '../interfaces/notification.interface';

@Injectable()
export class PushService implements OnModuleInit {
  private provider!: IPushProvider;

  constructor(
    private readonly pushFactory: PushFactory,
    private readonly deviceRegistrationService: DeviceRegistrationService,
  ) {}

  onModuleInit(): void {
    this.provider = this.pushFactory.create();
  }

  async send(input: SendPushInput): Promise<void> {
    await this.provider.send(input);
  }

  async sendToSubject(
    subjectId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    const deviceTokens = await this.deviceRegistrationService.getTokens(subjectId);
    if (deviceTokens.length === 0) return;
    await this.send({ deviceTokens, title, body, data });
  }
}
