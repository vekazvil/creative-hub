import 'server-only';

import { schema } from '@creative-hub/db';
import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { randomBytes } from 'node:crypto';

import { getDb } from './db';

const { publicLinks, requests } = schema;

export type PublicLink = (typeof publicLinks)['$inferSelect'];

const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** 12 characters from a 56-letter alphabet: about 70 bits, not guessable. */
export function newToken(length = 12): string {
  const bytes = randomBytes(length * 2);
  let out = '';
  for (let i = 0; i < bytes.length && out.length < length; i++) {
    // Skip bytes that would bias the pick (256 is not a multiple of 56).
    if (bytes[i]! < 224) out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out.length === length ? out : newToken(length);
}

const TOKEN_RE = /^[A-Za-z0-9]{8,32}$/;

export async function createPublicLink(email: string, label?: string) {
  const [row] = await getDb()
    .insert(publicLinks)
    .values({ token: newToken(), createdByEmail: email, label: label?.trim() || null })
    .returning();
  return row!;
}

/** Turns a link off or back on. Only its owner can. */
export async function setPublicLinkActive(id: string, email: string, active: boolean) {
  await getDb()
    .update(publicLinks)
    .set({ revokedAt: active ? null : new Date() })
    .where(and(eq(publicLinks.id, id), eq(publicLinks.createdByEmail, email)));
}

/** The link behind /l/<token>, if it exists and is on. Anything else is a 404. */
export async function getActiveLink(token: string): Promise<PublicLink> {
  if (!TOKEN_RE.test(token)) notFound();
  const [row] = await getDb()
    .select()
    .from(publicLinks)
    .where(and(eq(publicLinks.token, token), isNull(publicLinks.revokedAt)))
    .limit(1);
  if (!row) notFound();
  return row;
}

/** The owner's links, newest first, with the requests that came through each. */
export async function listPublicLinks(email: string) {
  const db = getDb();
  const links = await db
    .select()
    .from(publicLinks)
    .where(eq(publicLinks.createdByEmail, email))
    .orderBy(desc(publicLinks.createdAt))
    .limit(100);
  if (links.length === 0) return [];

  const ids = links.map((l) => l.id);
  const [byStatus, recent] = await Promise.all([
    db
      .select({ linkId: requests.publicLinkId, status: requests.status, n: count() })
      .from(requests)
      .where(inArray(requests.publicLinkId, ids))
      .groupBy(requests.publicLinkId, requests.status),
    db
      .select({
        id: requests.id,
        linkId: requests.publicLinkId,
        title: requests.title,
        workType: requests.workType,
        status: requests.status,
        updatedAt: requests.updatedAt,
      })
      .from(requests)
      .where(inArray(requests.publicLinkId, ids))
      .orderBy(desc(requests.updatedAt))
      .limit(500),
  ]);

  return links.map((link) => {
    const counts = byStatus.filter((r) => r.linkId === link.id);
    const total = counts.reduce((n, r) => n + r.n, 0);
    const drafts = counts
      .filter((r) => r.status === 'draft' || r.status === 'cancelled')
      .reduce((n, r) => n + r.n, 0);
    return {
      ...link,
      started: total,
      sent: total - drafts,
      requests: recent.filter((r) => r.linkId === link.id && r.status !== 'cancelled').slice(0, 20),
    };
  });
}
