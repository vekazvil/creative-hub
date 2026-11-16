# Google Drive test setup

Creative Hub writes only under the parent folder configured by `GOOGLE_DRIVE_ROOT_FOLDER_ID`.

## Why a Shared Drive

The app authenticates as a Google service account. Service accounts have no Drive storage
quota, so they cannot own files in anyone's **My Drive**: folder creation works there, but
uploading the brief PDF or attachments fails with `403 storageQuotaExceeded`. Files created in
a **Shared Drive** are owned by the drive, so uploads work. All Drive calls send
`supportsAllDrives=true`, so Shared Drive IDs work everywhere.

The old `Brand folders (test)` folder (`1JEkNu5ZE63Pb2VKEer1f0U2bcWXiQzft`) is in a My Drive
and only works for folder creation, not uploads.

## Setup (test Shared Drive on a Workspace account)

1. Enable the Google Drive API in the Google Cloud project that owns the service account.
2. Put the service account JSON in the local `.env` as `GOOGLE_SERVICE_ACCOUNT_JSON`.
   Keep the JSON on one line and preserve escaped `\n` characters in `private_key`.
3. In Google Drive (Workspace account), create a Shared Drive, e.g. `Creative Hub (test)`.
4. Manage members: add the service account's `client_email` as **Content manager**.
   If sharing with external accounts is restricted, a Workspace admin must allow it.
5. Inside the Shared Drive, create (or copy) the numbered brand folders. Moving folders out of
   a My Drive is often blocked, so copying is the usual route.
6. Set `GOOGLE_DRIVE_ROOT_FOLDER_ID` to the Shared Drive's ID (the part after
   `/drive/folders/` in its URL) or to a folder inside it.
7. Update the local `brands.drive_folder_id` values to the new brand folder IDs.
8. Start both the web app and `@creative-hub/worker`.

## What the app writes

A selected file is uploaded to `Creative Hub Uploads/draft-<request-id>` under the root.
Once the request is submitted, the worker creates `<brand-code>.<sequence>` under the brand
folder, writes `<project-number> - Brief.pdf` at its root, creates `Briefing and Assets`, and
moves the selected files into it. Staging and brand folders must be in the same Shared Drive
for the move to succeed.

## Production (client organization)

Same steps on the client's side: their Shared Drive, our service account as Content manager,
external sharing allowed for it. Only the env values and brand folder IDs change.

Do not commit `.env` or send service-account JSON through chat.
