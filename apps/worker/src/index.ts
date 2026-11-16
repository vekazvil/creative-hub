import {
  APP_NAME,
  buildBrief,
  resolveWorkType,
  type RequestFormData,
  type RequestMode,
} from '@creative-hub/core';
import { createDb, schema } from '@creative-hub/db';
import { and, eq, lte, or, sql } from 'drizzle-orm';
import {
  ensureDriveFolder,
  findDriveChild,
  getDriveFile,
  moveDriveFile,
  uploadDriveFile,
} from '@creative-hub/connectors';

const log = (msg: string) => console.log(`[worker] ${msg}`);
const { db, pool } = createDb();
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
} = schema;
const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
const POLL_MS = 2_000;
let stopping = false;
let busy = false;

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
  if (!brand[0]?.driveFolderId) throw new Error(`Brand ${brandCode} has no Google Drive folder ID`);
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
    if (!upload || typeof upload !== 'object' || !('id' in upload) || !('name' in upload)) continue;
    // Files are staged in a request folder under the test root and moved here after submission.
    if (!('parentId' in upload) || typeof upload.id !== 'string' || typeof upload.name !== 'string')
      continue;
    const file = await getDriveFile(upload.id);
    if (!file.parents?.includes(assetsFolder.id)) await moveDriveFile(upload.id, assetsFolder.id);
  }
  return { project, projectFolder, assetsFolder };
}

async function processJob() {
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
    const { project, projectFolder } = await createProjectDrive(request, data);
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
        data: { projectNumber: project.number, driveFolderId: projectFolder.id },
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

log(`${APP_NAME} worker started`);
const timer = setInterval(async () => {
  if (stopping || busy) return;
  busy = true;
  try {
    await processJob();
  } catch (error) {
    log(error instanceof Error ? error.message : String(error));
  } finally {
    busy = false;
  }
}, POLL_MS);

async function shutdown(signal: NodeJS.Signals) {
  if (stopping) return;
  stopping = true;
  log(`received ${signal}, shutting down`);
  clearInterval(timer);
  while (busy) await new Promise((resolve) => setTimeout(resolve, 50));
  await pool.end();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
