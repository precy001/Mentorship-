import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter?: Transporter;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASSWORD');
    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }
  }

  async sendActionEmail(to: string, subject: string, actionUrl: string, action: 'verify' | 'reset'): Promise<void> {
    const from = this.config.get<string>('EMAIL_FROM');
    if (!this.transporter || !from) {
      if (this.config.get<string>('NODE_ENV') === 'production') {
        this.logger.error('Email delivery is not configured; authentication email was not sent.');
        throw new InternalServerErrorException('Email delivery is temporarily unavailable.');
      }
      // Local development only: this link is deliberately not returned by the public API.
      this.logger.warn(`[DEV ONLY] ${action} email link for ${to}: ${actionUrl}`);
      return;
    }

    try {
      const actionLabel = action === 'verify' ? 'Verify email address' : 'Reset password';
      await this.transporter.sendMail({
        from,
        to,
        subject,
        text: `${actionLabel}: ${actionUrl}\n\nIf you did not request this, you can ignore this email.`,
        html: `<p>${actionLabel}</p><p><a href="${actionUrl}">${actionLabel}</a></p><p>If you did not request this, you can ignore this email.</p>`,
      });
    } catch {
      this.logger.error('Unable to deliver authentication email.');
      throw new InternalServerErrorException('Email delivery is temporarily unavailable.');
    }
  }
}
