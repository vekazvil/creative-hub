import { normalizeBrandText } from './brands';

/**
 * People who can sign off a request. They live in the `approvers` table; the app loads them
 * and passes the list in. The request stores the approver's email.
 */
export interface Approver {
  email: string;
  name: string;
  /** Role or team, e.g. "Brand manager". */
  title?: string;
  /** False once removed: no longer offered, but past requests still show the name. */
  active: boolean;
}

export function approverLabel(a: Approver): string {
  return a.title ? `${a.name} · ${a.title}` : a.name;
}

export function findApprover(approvers: readonly Approver[], email: string): Approver | undefined {
  const e = email.trim().toLowerCase();
  return approvers.find((a) => a.email === e);
}

/** Resolves an email or a full name ("Ana Ruiz", "ana@…") to one active approver. */
export function matchApprover(approvers: readonly Approver[], text: string): Approver | undefined {
  const active = approvers.filter((a) => a.active);
  const byEmail = findApprover(active, text);
  if (byEmail) return byEmail;
  const q = normalizeBrandText(text);
  if (!q) return undefined;
  const hits = active.filter((a) => normalizeBrandText(a.name) === q);
  return hits.length === 1 ? hits[0] : undefined;
}

/** Search for the picker: name, title or email, prefix matches first. Active approvers only. */
export function searchApprovers(approvers: readonly Approver[], query: string): Approver[] {
  const active = approvers.filter((a) => a.active);
  const q = normalizeBrandText(query);
  if (!q) return active;
  const scored = active
    .map((a, i) => {
      const parts = [a.name, a.title ?? '', a.email].map(normalizeBrandText);
      const score = parts.some((p) => p.startsWith(q) || p.split(' ').some((w) => w.startsWith(q)))
        ? 2
        : parts.some((p) => p.includes(q))
          ? 1
          : 0;
      return { a, score, i };
    })
    .filter((s) => s.score > 0);
  return scored.sort((x, y) => y.score - x.score || x.i - y.i).map((s) => s.a);
}
