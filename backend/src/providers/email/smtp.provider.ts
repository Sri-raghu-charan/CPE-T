import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { ServiceUnavailableError } from '../../utils/errors.js';
import { EmailProvider, SendEmailOptions, SendOtpEmailOptions } from './email.provider.js';

export class SMTPEmailProvider implements EmailProvider {
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter {
    if (!this.transporter) {
      if (!env.SMTP_HOST) {
        logger.error('[SMTPEmailProvider] SMTP_HOST is not configured in environment.');
        throw new ServiceUnavailableError(
          'Email service is temporarily unavailable. Please verify SMTP configuration.'
        );
      }

      const transportOptions: any = {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
      };

      if (env.SMTP_USER && env.SMTP_PASSWORD) {
        transportOptions.auth = {
          user: env.SMTP_USER,
          pass: env.SMTP_PASSWORD,
        };
      }

      this.transporter = nodemailer.createTransport(transportOptions);
    }

    return this.transporter;
  }

  public async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string }> {
    try {
      const transporter = this.getTransporter();
      const fromAddress = env.SMTP_FROM_NAME
        ? `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM}>`
        : env.SMTP_FROM;

      const info = await transporter.sendMail({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      logger.info('[SMTPEmailProvider] Email dispatched successfully', {
        to: options.to,
        subject: options.subject,
        messageId: info.messageId,
      });

      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      // Log technical error securely: NEVER log credentials, NEVER log secrets
      logger.error('[SMTPEmailProvider] Failed to dispatch email via SMTP', {
        to: options.to,
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        errorMessage: err.message,
        code: err.code,
      });

      throw new ServiceUnavailableError(
        'Unable to deliver verification email at this time. Please check your email address or try again shortly.'
      );
    }
  }

  public async sendOtpEmail(options: SendOtpEmailOptions): Promise<{ success: boolean; messageId?: string }> {
    const subject = 'Your CPET Verification Code';

    const textContent = [
      'Hello,',
      '',
      'Your CPET verification code is:',
      '',
      options.otp,
      '',
      'This code will expire in 5 minutes.',
      '',
      'If you did not request this code, you can safely ignore this email.',
      '',
      'Regards,',
      'CPET Team',
    ].join('\n');

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f8fafc;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:32px;">
    <tr>
      <td>
        <div style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:20px;letter-spacing:-0.02em;">CPET Verification</div>
        <p style="font-size:14px;line-height:22px;color:#334155;margin:0 0 16px 0;">Hello,</p>
        <p style="font-size:14px;line-height:22px;color:#334155;margin:0 0 16px 0;">Your CPET verification code is:</p>
        <div style="background-color:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;padding:16px;text-align:center;margin:24px 0;">
          <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:6px;color:#0f172a;">${options.otp}</span>
        </div>
        <p style="font-size:14px;line-height:22px;color:#475569;margin:0 0 16px 0;">This code will expire in <strong>5 minutes</strong>.</p>
        <p style="font-size:13px;line-height:20px;color:#64748b;margin:0 0 24px 0;">If you did not request this code, you can safely ignore this email.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
        <p style="font-size:13px;line-height:20px;color:#64748b;margin:0;">Regards,<br><strong>CPET Team</strong></p>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    return this.sendEmail({
      to: options.to,
      subject,
      text: textContent,
      html: htmlContent,
    });
  }
}
