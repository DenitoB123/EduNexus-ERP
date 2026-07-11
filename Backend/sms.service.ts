import { Injectable, OnModuleInit } from '@nestjs/common';
import { SmsFactory } from './sms.factory';
import { ISmsProvider, SendSmsInput } from '../interfaces/notification.interface';

@Injectable()
export class SmsService implements OnModuleInit {
  private provider!: ISmsProvider;

  constructor(private readonly smsFactory: SmsFactory) {}

  onModuleInit(): void {
    this.provider = this.smsFactory.create();
  }

  async send(input: SendSmsInput): Promise<void> {
    await this.provider.send(input);
  }
}
