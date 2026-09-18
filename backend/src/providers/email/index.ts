import { EmailProvider } from './email.provider.js';
import { SMTPEmailProvider } from './smtp.provider.js';

export * from './email.provider.js';
export * from './smtp.provider.js';

let activeEmailProvider: EmailProvider = new SMTPEmailProvider();

export function getEmailProvider(): EmailProvider {
  return activeEmailProvider;
}

export function setEmailProvider(provider: EmailProvider): void {
  activeEmailProvider = provider;
}
