import type { ReactNode } from 'react';

import { AppFooter } from '@/components/app/app-footer';
import { AppHeader } from '@/components/app/app-header';
import { requireSession } from '@/lib/session';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user } = await requireSession();
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <AppHeader user={user} />
      {/* Block wrapper so pages' `mx-auto max-w-*` keep their full width inside the flex column. */}
      <div className="flex-1">{children}</div>
      <AppFooter />
    </div>
  );
}
