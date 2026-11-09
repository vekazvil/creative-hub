import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  brandAliases,
  brands,
  chatMessages,
  chats,
  briefVersions,
  counters,
  events,
  operations,
  projects,
  requests,
} from './schema';
import { createTempDb } from './testing/temp-db';

const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)('core schema', () => {
  let t: Awaited<ReturnType<typeof createTempDb>>;

  beforeAll(async () => {
    t = await createTempDb();
  });
  afterAll(async () => {
    await t?.drop();
  });

  async function newRequest() {
    const [row] = await t.db
      .insert(requests)
      .values({
        requesterEmail: 'lucia@example.com',
        submittedByEmail: 'ana@example.com',
        workType: 'SELL',
      })
      .returning();
    return row!;
  }

  it('creates a request with defaults', async () => {
    const r = await newRequest();
    expect(r.status).toBe('draft');
    expect(r.mode).toBe('new');
    expect(r.priority).toBe('normal');
    expect(r.currentBriefVersion).toBe(0);
  });

  it('keeps brief versions unique per request', async () => {
    const r = await newRequest();
    const v = { requestId: r.id, version: 1, formVersion: 1, data: {}, createdByEmail: 'a@b.c' };
    await t.db.insert(briefVersions).values(v);
    await expect(t.db.insert(briefVersions).values(v)).rejects.toThrow();
  });

  it('allows one operation per (request, operation)', async () => {
    const r = await newRequest();
    await t.db.insert(operations).values({ requestId: r.id, operation: 'monday.item' });
    await expect(
      t.db.insert(operations).values({ requestId: r.id, operation: 'monday.item' }),
    ).rejects.toThrow();
    await t.db.insert(operations).values({ requestId: r.id, operation: 'drive.folder' });
  });

  it('keeps project numbers unique', async () => {
    const p = { brandCode: '01', sequence: 279, number: '01-.279', name: 'X', workType: 'SELL' };
    await t.db.insert(projects).values(p);
    await expect(t.db.insert(projects).values({ ...p, sequence: 280 })).rejects.toThrow();
  });

  it('stores one counter per brand', async () => {
    await t.db.insert(counters).values({ brandCode: '01', prefix: '01-.', lastValue: 279 });
    await expect(
      t.db.insert(counters).values({ brandCode: '01', prefix: '01-.' }),
    ).rejects.toThrow();
  });

  it('rejects UPDATE and DELETE on events', async () => {
    const [e] = await t.db
      .insert(events)
      .values({ type: 'request.transition', fromStatus: 'draft', toStatus: 'submitted' })
      .returning();
    expect(e!.id).toBeGreaterThan(0);
    const pgMessage = (p: Promise<unknown>) =>
      p.then(
        () => 'no error',
        (err: Error) => (err.cause as Error | undefined)?.message ?? err.message,
      );
    expect(
      await pgMessage(t.db.update(events).set({ type: 'changed' }).where(eq(events.id, e!.id))),
    ).toMatch(/append-only/);
    expect(await pgMessage(t.db.delete(events).where(eq(events.id, e!.id)))).toMatch(/append-only/);
  });

  it('seeds the brand list with other names, one row per name', async () => {
    const all = await t.db.select().from(brands);
    expect(all).toHaveLength(19);
    expect(all.find((b) => b.code === '01')).toMatchObject({ short: 'LC', name: 'La Costeña' });
    const lc = await t.db.select().from(brandAliases).where(eq(brandAliases.brandCode, '01'));
    expect(lc.map((a) => a.alias)).toContain('Costeña');
    await expect(
      t.db
        .insert(brandAliases)
        .values({ alias: 'COSTEÑA', normalized: 'costena', brandCode: '01' }),
    ).rejects.toMatchObject({ cause: { code: '23505' } });
  });

  it('keeps a pending name without a brand', async () => {
    const [row] = await t.db
      .insert(brandAliases)
      .values({ alias: 'Clemente Jacques', normalized: 'clemente jacques', status: 'pending' })
      .returning();
    expect(row).toMatchObject({ brandCode: null, status: 'pending' });
  });

  it('keeps chat messages in order and removes them with the chat', async () => {
    const [chat] = await t.db.insert(chats).values({ ownerEmail: 'lucia@example.com' }).returning();
    expect(chat).toMatchObject({ ready: false, requestId: null, deletedAt: null, state: {} });
    await t.db.insert(chatMessages).values([
      { chatId: chat!.id, role: 'user', content: 'We need a banner' },
      { chatId: chat!.id, role: 'assistant', content: 'For which event?' },
    ]);
    const msgs = await t.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.chatId, chat!.id))
      .orderBy(chatMessages.id);
    expect(msgs.map((m) => m.role)).toEqual(['user', 'assistant']);
    await t.db.delete(chats).where(eq(chats.id, chat!.id));
    expect(
      await t.db.select().from(chatMessages).where(eq(chatMessages.chatId, chat!.id)),
    ).toHaveLength(0);
  });
});
