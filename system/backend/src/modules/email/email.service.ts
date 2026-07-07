import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter | null;

  constructor() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    this.transporter =
      SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS
        ? nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT),
            secure: Number(SMTP_PORT) === 465,
            auth: { user: SMTP_USER, pass: SMTP_PASS },
          })
        : null;
  }

  /** Returns true if the email was actually sent (or would be, absent SMTP config in dev). */
  async send(to: string, subject: string, text: string): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(`SMTP not configured — would send email to ${to}\nSubject: ${subject}\n\n${text}`);
      return false;
    }
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'no-reply@clinical-workflow.local',
        to,
        subject,
        text,
      });
      return true;
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}`, err as Error);
      return false;
    }
  }
}
