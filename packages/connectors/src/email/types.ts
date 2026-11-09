export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SentEmail {
  /** ID from the provider (or a generated one for fakes). */
  id: string;
}

/** Sends one email. Real versions: Microsoft Graph sendMail or Gmail (task 3.8). */
export interface EmailSender {
  send(message: EmailMessage): Promise<SentEmail>;
}
