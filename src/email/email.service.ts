import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private provider: string;
  private from: string;
  private apiKey: string | undefined;
  private transport: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null =
    null;

  constructor(private config: ConfigService) {
    this.provider = (this.config.get('EMAIL_PROVIDER') as string) ?? 'none';
    this.from =
      (this.config.get('EMAIL_FROM') as string) ?? 'no-reply@lendly.local';
    this.apiKey = this.config.get('EMAIL_API_KEY');
    this.transport = this.buildTransport();
  }

  private buildTransport() {
    if (this.provider === 'gmail') {
      const user = this.config.get('EMAIL_GMAIL_USER');
      const pass = this.config.get('EMAIL_GMAIL_PASS');
      if (!user || !pass) {
        this.logger.error(
          'EMAIL_PROVIDER=gmail requires EMAIL_GMAIL_USER and EMAIL_GMAIL_PASS',
        );
        return null;
      }
      return nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
    }

    if (this.provider === 'smtp') {
      const host = this.config.get('EMAIL_SMTP_HOST');
      const port = Number(this.config.get('EMAIL_SMTP_PORT') ?? 587);
      const user = this.config.get('EMAIL_SMTP_USER');
      const pass = this.config.get('EMAIL_SMTP_PASS');
      if (!host || !user || !pass) {
        this.logger.error(
          'EMAIL_PROVIDER=smtp requires EMAIL_SMTP_HOST, EMAIL_SMTP_USER and EMAIL_SMTP_PASS',
        );
        return null;
      }
      return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }

    if (this.provider === 'none') {
      return null;
    }

    this.logger.warn(
      `Unknown email provider: ${this.provider}. Falling back to console.`,
    );
    return null;
  }

  async send(to: string, subject: string, html: string, text?: string) {
    if (!this.transport) {
      this.logger.log(
        `Email send (console fallback) to=${to} subject=${subject}`,
      );
      this.logger.debug(`body html=${html}`);
      return;
    }

    try {
      await this.transport.sendMail({
        from: this.from,
        to,
        subject,
        html,
        text: text ?? html.replace(/<[^>]*>/g, ''),
      });
      this.logger.log(`Email sent to ${to} via provider ${this.provider}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      throw error;
    }
  }
}
