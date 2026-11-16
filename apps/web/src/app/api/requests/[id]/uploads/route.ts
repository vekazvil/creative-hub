import { ensureDriveFolder, uploadDriveFile } from '@creative-hub/connectors';
import { NextResponse } from 'next/server';

import { getOwnRequest, getPublicRequest } from '@/lib/requests/data';
import { getActiveLink } from '@/lib/public-links';
import { getSession } from '@/lib/session';

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    if (token) {
      const link = await getActiveLink(token);
      const own = await getPublicRequest(link.id, id);
      if (own.request.status !== 'draft')
        return NextResponse.json({ error: 'This request is no longer a draft.' }, { status: 409 });
    } else {
      const session = await getSession();
      if (!session)
        return NextResponse.json({ error: 'Sign in to upload files.' }, { status: 401 });
      const own = await getOwnRequest(id, session.user.email);
      if (own.request.status !== 'draft')
        return NextResponse.json({ error: 'This request is no longer a draft.' }, { status: 409 });
    }
    const declaredSize = Number(request.headers.get('content-length') ?? 0);
    if (declaredSize > MAX_FILE_SIZE + 256_000)
      return NextResponse.json({ error: 'Files must be 100 MB or smaller.' }, { status: 413 });
    if (!ROOT_FOLDER_ID)
      return NextResponse.json(
        { error: 'Google Drive test folder is not configured.' },
        { status: 503 },
      );
    const body = await request.formData();
    const file = body.get('file');
    const fieldId = body.get('fieldId');
    if (!(file instanceof File) || typeof fieldId !== 'string' || !fieldId)
      return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 });
    if (file.size > MAX_FILE_SIZE)
      return NextResponse.json({ error: 'Files must be 100 MB or smaller.' }, { status: 413 });
    const root = await ensureDriveFolder('Creative Hub Uploads', ROOT_FOLDER_ID);
    const staging = await ensureDriveFolder(`draft-${id}`, root.id);
    // eslint-disable-next-line no-control-regex -- control characters are exactly what we strip
    const safeName = file.name.replace(/[\\/\u0000-\u001f]/g, '_').slice(0, 255) || 'upload';
    const uploaded = await uploadDriveFile({
      name: safeName,
      mimeType: file.type || 'application/octet-stream',
      parentId: staging.id,
      bytes: Buffer.from(await file.arrayBuffer()),
    });
    return NextResponse.json({
      upload: {
        id: uploaded.id,
        name: uploaded.name,
        parentId: staging.id,
        fieldId,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed.';
    console.error('Drive upload failed', message);
    return NextResponse.json(
      {
        error:
          'Could not upload the file to Google Drive. Check the test Drive connection and try again.',
      },
      { status: 502 },
    );
  }
}
