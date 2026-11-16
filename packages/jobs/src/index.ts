import {
  buildBrief,
  resolveWorkType,
  type RequestFormData,
  type RequestMode,
} from '@creative-hub/core';
import { schema, type Database } from '@creative-hub/db';
import { and, eq, lte, or, sql } from 'drizzle-orm';
import {
  createMondayItem,
  createMondaySubitem,
  ensureDriveFolder,
  findDriveChild,
  findMondayItemByName,
  findMondayUserIds,
  getDriveFile,
  getMondayBoard,
  listMondaySubitems,
  moveDriveFile,
  uploadDriveFile,
} from '@creative-hub/connectors';

import { COL, mondayProjectPlan } from './monday-project';

const {
  outbox,
  requests,
  briefVersions,
  brands,
  brandAliases,
  approvers,
  counters,
  projects,
  events,
  operations,
} = schema;

const log = (msg: string) => console.log(`[jobs] ${msg}`);

/** Read at call time: the web app and the worker load env differently. */
function config() {
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  const mondayBoardId = process.env.MONDAY_BOARD_ID;
  return {
    rootFolderId,
    driveOn: !!(process.env.GOOGLE_SERVICE_ACCOUNT_JSON && rootFolderId),
    mondayBoardId,
    mondayOn: !!(process.env.MONDAY_API_TOKEN && mondayBoardId),
    /** People columns notify real people, so they stay empty unless this is turned on. */
    mondayAssignPeople: process.env.MONDAY_ASSIGN_PEOPLE === 'true',
    appUrl: (process.env.APP_URL || process.env.BETTER_AUTH_URL || '').replace(/\/$/, ''),
  };
}

/** Which integrations are on, for a startup line. */
export function jobsConfigSummary() {
  const c = config();
  return `Drive ${c.driveOn ? 'on' : 'off'}, Monday ${c.mondayOn ? `on, board ${c.mondayBoardId}` : 'off'}`;
}

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function ascii(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, '?');
}

function pdfEscape(value: string) {
  return ascii(value).replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
}

/** Small dependency-free PDF writer for the project's text brief. */
function makePdf(
  title: string,
  sections: { title: string; rows: { label: string; value: string }[] }[],
) {
  const lines = [
    title,
    ...sections.flatMap((section) => [
      section.title,
      ...section.rows.flatMap((row) => {
        const raw = `${row.label}: ${row.value || '—'}`;
        const chunks: string[] = [];
        for (let i = 0; i < raw.length; i += 92) chunks.push(raw.slice(i, i + 92));
        return chunks.length ? chunks : [''];
      }),
      '',
    ]),
  ];
  const pageLines: string[][] = [];
  for (let i = 0; i < lines.length; i += 48) pageLines.push(lines.slice(i, i + 48));
  if (pageLines.length === 0) pageLines.push([]);
  const objects: string[] = [];
  const add = (value: string) => (objects.push(value), objects.length);
  const catalogId = add('');
  const pagesId = add('');
  const fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageIds: number[] = [];
  for (const page of pageLines) {
    const stream = `BT\n/F1 10 Tf\n48 750 Td\n14 TL\n${page.map((line, i) => `${i ? 'T*\n' : ''}(${pdfEscape(line)}) Tj`).join('\n')}\nET`;
    const streamId = add(
      `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`,
    );
    pageIds.push(
      add(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${streamId} 0 R >>`,
      ),
    );
  }
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] =
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  let output = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(output, 'ascii'));
    output += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = Buffer.byteLength(output, 'ascii');
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) output += `${String(offset).padStart(10, '0')} 00000 n \n`;
  output += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(output, 'ascii');
}

/**
 * Project creation jobs from the outbox: number, Drive folder, Monday item. Each step is recorded
 * in `operations`, so a retry only redoes what failed. Used by the worker (local) and by the web
 * app on Vercel (right after Send, and from /api/jobs/run for retries).
 */
export function createJobRunner(db: Database) {
  async function reserveProject(request: typeof requests.$inferSelect, briefData: RequestFormData) {
    const existing = await db
      .select()
      .from(projects)
      .where(eq(projects.requestId, request.id))
      .limit(1);
    if (existing[0]) return existing[0];
    const brandCode = request.brandCode;
    if (!brandCode) throw new Error('Request has no selected brand');
    const brand = await db.select().from(brands).where(eq(brands.code, brandCode)).limit(1);
    if (!brand[0]) throw new Error(`Unknown brand ${brandCode}`);
    const title = text(briefData.values.title) || `Request ${request.id.slice(0, 8)}`;
    const result = await db.transaction(async (tx) => {
      const [counter] = await tx
        .insert(counters)
        .values({
          brandCode,
          prefix: `${brandCode}.`,
          lastValue: 1,
        })
        .onConflictDoUpdate({
          target: counters.brandCode,
          set: {
            prefix: `${brandCode}.`,
            lastValue: sql`${counters.lastValue} + 1`,
            updatedAt: new Date(),
          },
        })
        .returning({ lastValue: counters.lastValue });
      const sequence = counter!.lastValue;
      const number = `${brandCode}.${String(sequence).padStart(2, '0')}`;
      const type = resolveWorkType(request.workType, briefData);
      if (!type) throw new Error('Unknown work type on request');
      const [project] = await tx
        .insert(projects)
        .values({
          requestId: request.id,
          brandCode,
          sequence,
          number,
          name: title,
          workType: request.workType,
          ownerEmail: request.requesterEmail,
          startOn: request.firstDraftOn,
          dueOn: request.finalFilesOn,
        })
        .returning();
      return project!;
    });
    return result;
  }

  async function createProjectDrive(
    request: typeof requests.$inferSelect,
    briefData: RequestFormData,
  ) {
    const { rootFolderId: ROOT_FOLDER_ID } = config();
    if (!ROOT_FOLDER_ID) throw new Error('GOOGLE_DRIVE_ROOT_FOLDER_ID is not configured');
    const type = resolveWorkType(request.workType, briefData);
    if (!type) throw new Error('Unknown work type on request');
    const [brand] = await db
      .select()
      .from(brands)
      .where(eq(brands.code, request.brandCode!))
      .limit(1);
    if (!brand?.driveFolderId)
      throw new Error(`Brand ${request.brandCode} has no Google Drive folder ID`);
    const aliases = await db
      .select()
      .from(brandAliases)
      .where(eq(brandAliases.brandCode, brand.code));
    const brandList = [
      {
        code: brand.code,
        short: brand.short ?? undefined,
        name: brand.name,
        aliases: aliases.map((a) => a.alias),
      },
    ];
    const people = (await db.select().from(approvers).where(eq(approvers.active, true))).map(
      (person) => ({
        email: person.email,
        name: person.name,
        title: person.title ?? undefined,
        active: person.active,
      }),
    );
    const brief = buildBrief(
      type,
      request.mode as RequestMode,
      briefData,
      request.requesterEmail,
      brandList,
      people,
    );
    const project = await reserveProject(request, briefData);
    const projectFolder = await ensureDriveFolder(project.number, brand.driveFolderId);
    const assetsFolder = await ensureDriveFolder('Briefing and Assets', projectFolder.id);
    const briefName = `${project.number} - Brief.pdf`;
    if (!(await findDriveChild(projectFolder.id, briefName))) {
      const bytes = makePdf(
        `${project.number} — ${project.name}`,
        brief.map((s) => ({ title: s.title, rows: s.rows })),
      );
      await uploadDriveFile({
        name: briefName,
        mimeType: 'application/pdf',
        parentId: projectFolder.id,
        bytes,
      });
    }
    const uploads = Array.isArray(briefData.uploads) ? briefData.uploads : [];
    for (const upload of uploads) {
      if (!upload || typeof upload !== 'object' || !('id' in upload) || !('name' in upload))
        continue;
      // Files are staged in a request folder under the test root and moved here after submission.
      if (
        !('parentId' in upload) ||
        typeof upload.id !== 'string' ||
        typeof upload.name !== 'string'
      )
        continue;
      const file = await getDriveFile(upload.id);
      if (!file.parents?.includes(assetsFolder.id)) await moveDriveFile(upload.id, assetsFolder.id);
    }
    return { project, projectFolder, assetsFolder };
  }

  /**
   * One step of creating a project (Drive folder, Monday item…), recorded in `operations` so a
   * retried job skips what already succeeded. Returns the external id.
   */
  async function runStep(
    requestId: string,
    operation: string,
    fn: () => Promise<{ externalId: string; response?: Record<string, unknown> }>,
  ): Promise<string> {
    const [done] = await db
      .select()
      .from(operations)
      .where(and(eq(operations.requestId, requestId), eq(operations.operation, operation)))
      .limit(1);
    if (done?.status === 'succeeded' && done.externalId) return done.externalId;
    await db
      .insert(operations)
      .values({ requestId, operation, status: 'started', attempts: 1 })
      .onConflictDoUpdate({
        target: [operations.requestId, operations.operation],
        set: {
          status: 'started',
          attempts: sql`${operations.attempts} + 1`,
          updatedAt: new Date(),
        },
      });
    try {
      const { externalId, response } = await fn();
      await db
        .update(operations)
        .set({
          status: 'succeeded',
          externalId,
          response: response ?? null,
          error: null,
          completedAt: new Date(),
        })
        .where(and(eq(operations.requestId, requestId), eq(operations.operation, operation)));
      return externalId;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await db
        .update(operations)
        .set({ status: 'failed', error: message.slice(0, 2000) })
        .where(and(eq(operations.requestId, requestId), eq(operations.operation, operation)));
      throw error;
    }
  }

  /** The project item on the Master Board with its process subitems. Creates only, never deletes. */
  async function createMondayProject(
    request: typeof requests.$inferSelect,
    data: RequestFormData,
    project: typeof projects.$inferSelect,
    driveFolderId: string | undefined,
  ) {
    const type = resolveWorkType(request.workType, data);
    if (!type) throw new Error('Unknown work type on request');
    const [brand] = await db
      .select()
      .from(brands)
      .where(eq(brands.code, project.brandCode))
      .limit(1);
    if (!brand) throw new Error(`Unknown brand ${project.brandCode}`);
    const {
      mondayBoardId: MONDAY_BOARD_ID,
      mondayAssignPeople: MONDAY_ASSIGN_PEOPLE,
      appUrl: APP_URL,
    } = config();
    const plan = mondayProjectPlan({
      type,
      data,
      project,
      brand,
      briefUrl: `${APP_URL}/requests/${request.id}`,
      driveUrl: driveFolderId
        ? `https://drive.google.com/drive/folders/${driveFolderId}`
        : undefined,
    });
    const board = await getMondayBoard(MONDAY_BOARD_ID!);
    const group = board.groups.find((g) => g.title === plan.group);
    const columnId = new Map(board.columns.map((c) => [c.title, c.id]));
    const values: Record<string, unknown> = {};
    for (const [title, value] of Object.entries(plan.values)) {
      const id = columnId.get(title);
      if (id) values[id] = value;
    }
    if (MONDAY_ASSIGN_PEOPLE && plan.approverEmail && columnId.has(COL.approver)) {
      const id = (await findMondayUserIds([plan.approverEmail])).get(
        plan.approverEmail.toLowerCase(),
      );
      if (id) values[columnId.get(COL.approver)!] = { personsAndTeams: [{ id, kind: 'person' }] };
    }
    const itemId =
      (await findMondayItemByName(board.id, plan.name))?.id ??
      (await createMondayItem({
        boardId: board.id,
        groupId: group?.id,
        name: plan.name,
        columnValues: values,
      }));
    const existing = new Set((await listMondaySubitems(itemId)).map((s) => s.name));
    for (const name of plan.subitems)
      if (!existing.has(name)) await createMondaySubitem(itemId, name);
    return { externalId: itemId, response: { boardId: board.id, name: plan.name } };
  }

  async function processJob(): Promise<boolean> {
    const { driveOn: DRIVE_ON, mondayOn: MONDAY_ON } = config();
    const job = await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(outbox)
        .where(
          and(
            or(eq(outbox.status, 'pending'), eq(outbox.status, 'processing')),
            lte(outbox.nextAttemptAt, new Date()),
          ),
        )
        .orderBy(outbox.createdAt)
        .limit(1)
        .for('update', { skipLocked: true });
      if (!row) return undefined;
      await tx
        .update(outbox)
        .set({
          status: 'processing',
          attempts: row.attempts + 1,
          nextAttemptAt: new Date(Date.now() + 10 * 60_000),
        })
        .where(eq(outbox.id, row.id));
      return row;
    });
    if (!job) return false;
    try {
      if (job.kind !== 'project.create' || !job.requestId)
        throw new Error(`Unsupported outbox job: ${job.kind}`);
      const [request] = await db
        .select()
        .from(requests)
        .where(eq(requests.id, job.requestId))
        .limit(1);
      const [version] = await db
        .select()
        .from(briefVersions)
        .where(and(eq(briefVersions.requestId, job.requestId), eq(briefVersions.version, 1)))
        .limit(1);
      if (!request || !version) throw new Error('Request or submitted brief was not found');
      const data = version.data as unknown as RequestFormData;
      const project = await reserveProject(request, data);
      // Each step runs on its own: Monday still gets its item while Drive waits for access.
      const failures: string[] = [];
      let driveFolderId: string | undefined;
      if (DRIVE_ON) {
        try {
          driveFolderId = await runStep(request.id, 'drive.folder', async () => {
            const { projectFolder } = await createProjectDrive(request, data);
            return { externalId: projectFolder.id };
          });
        } catch (error) {
          failures.push(`Drive: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      let mondayItemId: string | undefined;
      if (MONDAY_ON) {
        try {
          mondayItemId = await runStep(request.id, 'monday.item', () =>
            createMondayProject(request, data, project, driveFolderId),
          );
        } catch (error) {
          failures.push(`Monday: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      if (failures.length) throw new Error(failures.join(' | '));
      await db.transaction(async (tx) => {
        await tx
          .update(outbox)
          .set({ status: 'done', processedAt: new Date(), lastError: null })
          .where(eq(outbox.id, job.id));
        await tx.insert(events).values({
          requestId: request.id,
          projectId: project.id,
          type: 'project.created',
          toStatus: 'submitted',
          briefVersion: 1,
          data: {
            projectNumber: project.number,
            ...(driveFolderId && { driveFolderId }),
            ...(mondayItemId && { mondayItemId }),
          },
        });
      });
      log(`created ${project.number} for request ${request.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retry = job.attempts < 7;
      await db
        .update(outbox)
        .set({
          status: retry ? 'pending' : 'failed',
          lastError: message.slice(0, 2000),
          nextAttemptAt: new Date(Date.now() + Math.min(60_000, 1_000 * 2 ** job.attempts)),
        })
        .where(eq(outbox.id, job.id));
      await db.insert(events).values({
        requestId: job.requestId,
        type: 'operation.failed',
        error: message.slice(0, 2000),
        data: { job: job.kind, retry },
      });
      log(`job ${job.id} failed${retry ? ' (retry queued)' : ''}: ${message}`);
    }
    return true;
  }

  /** Runs due jobs one by one until none are left, `max` are done or time runs out. */
  async function processDueJobs(opts: { max?: number; budgetMs?: number } = {}) {
    const { max = 20, budgetMs = 50_000 } = opts;
    const until = Date.now() + budgetMs;
    let processed = 0;
    while (processed < max && Date.now() < until && (await processJob())) processed++;
    return processed;
  }

  return { processJob, processDueJobs };
}
