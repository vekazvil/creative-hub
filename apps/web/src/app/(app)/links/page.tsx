import type { Metadata } from 'next';

import { env } from '@/lib/env';
import { listPublicLinks } from '@/lib/public-links';
import { requireSession } from '@/lib/session';

import { CreateLink, LinkCard } from './links';

export const metadata: Metadata = { title: 'Public links' };

export default async function LinksPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const { user } = await requireSession();
  const { new: fresh } = await searchParams;
  const links = await listPublicLinks(user.email);
  const origin = env().BETTER_AUTH_URL.replace(/\/$/, '');

  return (
    <main className="mx-auto max-w-4xl px-4 pt-10 pb-24 sm:px-6">
      <h1 className="text-[34px] leading-tight font-semibold sm:text-[40px]">Public links</h1>
      <p className="mt-2 max-w-2xl text-[17px] text-muted-foreground">
        Share a link with people outside Creative Hub. Anyone who has it can send a request without
        an account. What comes in shows up here and in My requests.
      </p>

      <CreateLink focus={fresh === '1'} />

      {links.length === 0 ? (
        <p className="mt-10 rounded-3xl border border-dashed border-input p-8 text-center text-[15px] text-muted-foreground">
          No links yet. Create one above and share it.
        </p>
      ) : (
        <ul className="mt-10 space-y-4">
          {links.map((l) => (
            <li key={l.id}>
              <LinkCard
                link={{
                  id: l.id,
                  label: l.label,
                  url: `${origin}/l/${l.token}`,
                  active: !l.revokedAt,
                  createdAt: l.createdAt.toISOString(),
                  started: l.started,
                  sent: l.sent,
                  requests: l.requests.map((r) => ({
                    ...r,
                    updatedAt: r.updatedAt.toISOString(),
                  })),
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
