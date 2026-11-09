import 'server-only';

import { ConsoleEmailSender, type EmailSender } from '@creative-hub/connectors';

let sender: EmailSender | undefined;

/**
 * Email sender for the web app. Until Microsoft Graph or Gmail is connected (task 3.8)
 * this prints messages to the server console.
 */
export function getEmailSender(): EmailSender {
  sender ??= new ConsoleEmailSender();
  return sender;
}
