import type { EmailMessage } from '@creative-hub/connectors';
import { APP_NAME } from '@creative-hub/core';

const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

function layout(
  heading: string,
  body: string,
  cta: { label: string; url: string },
  footnote: string,
) {
  return `<!doctype html><html><body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:18px;padding:40px">
<tr><td style="font-size:15px;font-weight:600;color:#6e6e73;padding-bottom:24px">${APP_NAME}</td></tr>
<tr><td style="font-size:24px;font-weight:600;letter-spacing:-0.02em;padding-bottom:12px">${escape(heading)}</td></tr>
<tr><td style="font-size:15px;line-height:1.5;color:#424245;padding-bottom:28px">${body}</td></tr>
<tr><td style="padding-bottom:28px"><a href="${escape(cta.url)}" style="display:inline-block;background:#0071e3;color:#ffffff;text-decoration:none;font-size:15px;font-weight:500;padding:12px 22px;border-radius:980px">${escape(cta.label)}</a></td></tr>
<tr><td style="font-size:13px;line-height:1.5;color:#86868b">${escape(footnote)}</td></tr>
</table></td></tr></table></body></html>`;
}

export function verificationEmail(to: { name: string; email: string }, url: string): EmailMessage {
  const first = to.name.split(' ')[0] || to.name;
  return {
    to: to.email,
    subject: `Confirm your email for ${APP_NAME}`,
    text: `Hi ${first},\n\nConfirm your email to finish setting up your ${APP_NAME} account:\n${url}\n\nIf you didn't create an account, you can ignore this email.`,
    html: layout(
      'Confirm your email',
      `Hi ${escape(first)}, confirm your email to finish setting up your account.`,
      { label: 'Confirm email', url },
      "If you didn't create an account, you can ignore this email.",
    ),
  };
}

export function resetPasswordEmail(to: { name: string; email: string }, url: string): EmailMessage {
  const first = to.name.split(' ')[0] || to.name;
  return {
    to: to.email,
    subject: `Reset your ${APP_NAME} password`,
    text: `Hi ${first},\n\nUse this link to choose a new password. It works for 1 hour:\n${url}\n\nIf you didn't ask for this, you can ignore this email. Your password stays the same.`,
    html: layout(
      'Reset your password',
      `Hi ${escape(first)}, use the button below to choose a new password. The link works for 1 hour.`,
      { label: 'Choose a new password', url },
      "If you didn't ask for this, you can ignore this email. Your password stays the same.",
    ),
  };
}
