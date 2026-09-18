export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SendOtpEmailOptions {
  to: string;
  otp: string;
  purpose?: string;
}

export interface EmailProvider {
  sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string }>;
  sendOtpEmail(options: SendOtpEmailOptions): Promise<{ success: boolean; messageId?: string }>;
}
