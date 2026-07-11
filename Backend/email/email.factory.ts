import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { IEmailProvider } from '../interfaces/notification.interface';
import { SmtpProvider } from './smtp.provider';

@Injectable()
export class EmailFactory {
  constructor(private readonly configService: AppConfigService) {}

  create(): IEmailProvider {
    const { smtp, from } = this.configService.email;

    return new SmtpProvider({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      user: smtp.user,
      password: smtp.password,
      defaultFrom: from,
    });
  }
}
