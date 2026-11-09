import { randomUUID } from 'node:crypto';

import type { EmailMessage, EmailSender, SentEmail } from './types';

/** Keeps every message in memory. For tests. */
export class InMemoryEmailSender implements EmailSender {
  readonly sent: (EmailMessage & SentEmail)[] = [];

  async send(message: EmailMessage): Promise<SentEmail> {
    const id = randomUUID();
    this.sent.push({ ...message, id });
    return { id };
  }

  last(): (EmailMessage & SentEmail) | undefined {
    return this.sent.at(-1);
  }
}

/** Prints every message to the console. For local development until a real provider exists. */
export class ConsoleEmailSender implements EmailSender {
  async send(message: EmailMessage): Promise<SentEmail> {
    const id = randomUUID();
    const line = '─'.repeat(60);
    console.info(
      `\n${line}\n✉  Email (not sent — dev console)\nTo:      ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n${line}\n`,
    );
    return { id };
  }
}
