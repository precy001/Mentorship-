
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendActionEmail(
    to: string,
    subject: string,
    actionUrl: string,
    action: 'verify' | 'reset',
  ): Promise<void> {
    const apiKey = this.config.get<string>('BREVO_API_KEY');
    const from = this.config.get<string>('EMAIL_FROM');

    if (!apiKey || !from) {
      if (this.config.get<string>('NODE_ENV') === 'production') {
        this.logger.error(
          'Brevo email configuration is missing.',
        );

        throw new InternalServerErrorException(
          'Email delivery is temporarily unavailable.',
        );
      }

      // Local development only.
      this.logger.warn(
        `[DEV ONLY] ${action} email link for ${to}: ${actionUrl}`,
      );
      return;
    }

    const senderMatch = from.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);

    const senderName = senderMatch?.[1]?.trim() || 'Mentorship+';
    const senderEmail = senderMatch?.[2]?.trim() || from.trim();

    try {
      const actionLabel =
        action === 'verify'
          ? 'Verify email address'
          : 'Reset password';

      const textContent =
        `${actionLabel}: ${actionUrl}\n\n` +
        'If you did not request this, you can ignore this email.';

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <body>
            <h2>Mentorship+</h2>
            <p>${actionLabel}</p>
            <p>
              <a href="${actionUrl}">${actionLabel}</a>
            </p>
            <p>
              If you did not request this, you can ignore this email.
            </p>
          </body>
        </html>
      `;

      const response = await fetch(
        'https://api.brevo.com/v3/smtp/email',
        {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'api-key': apiKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sender: {
              name: senderName,
              email: senderEmail,
            },
            to: [{ email: to }],
            subject,
            textContent,
            htmlContent,
          }),
        },
      );

      const responseBody = await response.text();

      if (!response.ok) {
        this.logger.error(
          `Brevo email request failed: ${JSON.stringify({
            status: response.status,
            response: responseBody.slice(0, 500),
          })}`,
        );

        throw new Error(
          `Brevo API returned HTTP ${response.status}`,
        );
      }

      this.logger.log(
        `${actionLabel} email accepted by Brevo for ${to}.`,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown email delivery error';

      this.logger.error(
        `Unable to deliver authentication email: ${message.slice(0, 300)}`,
      );

      throw new InternalServerErrorException(
        'Email delivery is temporarily unavailable.',
      );
    }
  }
}