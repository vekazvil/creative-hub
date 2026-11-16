import { createSign } from 'node:crypto';

const FOLDER_MIME = 'application/vnd.google-apps.folder';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

type ServiceAccount = { client_email: string; private_key: string };
type DriveFile = { id: string; name: string; mimeType?: string; parents?: string[] };

let tokenCache: { token: string; expiresAt: number } | undefined;

function serviceAccount(): ServiceAccount {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not configured');
  const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
  if (!parsed.client_email || !parsed.private_key)
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON must include client_email and private_key');
  return parsed as ServiceAccount;
}

function b64url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url');
}

async function accessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;
  const account = serviceAccount();
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(
    JSON.stringify({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/drive',
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  )}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  const assertion = `${unsigned}.${signer.sign(account.private_key).toString('base64url')}`;
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!response.ok) throw new Error(`Google token request failed (${response.status})`);
  const data = (await response.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return tokenCache.token;
}

/** Shared Drive items return 404 unless every call opts in. */
function withAllDrives(path: string) {
  return `${path}${path.includes('?') ? '&' : '?'}supportsAllDrives=true`;
}

async function api<T>(path: string, init: RequestInit = {}, upload = false): Promise<T> {
  const token = await accessToken();
  const response = await fetch(`${upload ? DRIVE_UPLOAD_API : DRIVE_API}${withAllDrives(path)}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, ...init.headers },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Drive request failed (${response.status}): ${detail.slice(0, 500)}`);
  }
  return (await response.json()) as T;
}

export async function createDriveFolder(name: string, parentId: string): Promise<DriveFile> {
  return api<DriveFile>('/files?fields=id,name,mimeType,parents', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
  });
}

export async function findDriveChild(
  parentId: string,
  name: string,
): Promise<DriveFile | undefined> {
  const q = `'${parentId.replaceAll("'", "\\'")}' in parents and name = '${name.replaceAll("'", "\\'")}' and trashed = false`;
  const params = new URLSearchParams({
    q,
    fields: 'files(id,name,mimeType,parents)',
    pageSize: '100',
    corpora: 'allDrives',
    includeItemsFromAllDrives: 'true',
  });
  const result = await api<{ files: DriveFile[] }>(`/files?${params}`);
  return result.files[0];
}

export async function ensureDriveFolder(name: string, parentId: string): Promise<DriveFile> {
  const found = await findDriveChild(parentId, name);
  if (found) {
    if (found.mimeType !== FOLDER_MIME)
      throw new Error(`A non-folder item named ${name} already exists`);
    return found;
  }
  return createDriveFolder(name, parentId);
}

export async function uploadDriveFile(input: {
  name: string;
  mimeType: string;
  parentId: string;
  bytes: Buffer;
}): Promise<DriveFile> {
  const token = await accessToken();
  const response = await fetch(
    `${DRIVE_UPLOAD_API}/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,mimeType,parents`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json; charset=UTF-8',
        'x-upload-content-type': input.mimeType,
        'x-upload-content-length': String(input.bytes.byteLength),
      },
      body: JSON.stringify({
        name: input.name,
        mimeType: input.mimeType,
        parents: [input.parentId],
      }),
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Google Drive upload session failed (${response.status}): ${detail.slice(0, 500)}`,
    );
  }
  const location = response.headers.get('location');
  if (!location) throw new Error('Google Drive did not return an upload URL');
  const payload = new ArrayBuffer(input.bytes.byteLength);
  new Uint8Array(payload).set(input.bytes);
  const uploaded = await fetch(location, {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}`, 'content-type': input.mimeType },
    body: payload,
  });
  if (!uploaded.ok) throw new Error(`Google Drive file upload failed (${uploaded.status})`);
  return (await uploaded.json()) as DriveFile;
}

export async function getDriveFile(fileId: string): Promise<DriveFile> {
  return api<DriveFile>(`/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,parents`);
}

export async function moveDriveFile(fileId: string, newParentId: string) {
  const file = await getDriveFile(fileId);
  if (file.parents?.includes(newParentId)) return file;
  const params = new URLSearchParams({
    addParents: newParentId,
    ...(file.parents?.length ? { removeParents: file.parents.join(',') } : {}),
    fields: 'id,name,parents',
  });
  return api<DriveFile>(`/files/${encodeURIComponent(fileId)}?${params}`, { method: 'PATCH' });
}
