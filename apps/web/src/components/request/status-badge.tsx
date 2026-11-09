import type { RequestStatus } from '@creative-hub/core';

import { cn } from '@/lib/utils';

const STATUS: Record<RequestStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-secondary text-muted-foreground' },
  submitted: { label: 'Sent', className: 'bg-accent text-accent-foreground' },
  pending_approval: {
    label: 'Waiting for approval',
    className: 'bg-[#fff4e5] text-[#8a4b00] dark:bg-[#3a2a12] dark:text-[#ffb35c]',
  },
  approved: { label: 'Approved', className: 'bg-accent text-accent-foreground' },
  rejected: { label: 'Not approved', className: 'bg-destructive/10 text-destructive' },
  creating: { label: 'Setting up', className: 'bg-accent text-accent-foreground' },
  created: { label: 'In progress', className: 'bg-success/10 text-success' },
  failed: { label: 'Needs attention', className: 'bg-destructive/10 text-destructive' },
  cancelled: { label: 'Cancelled', className: 'bg-secondary text-muted-foreground' },
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const s = STATUS[status];
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        s.className,
      )}
    >
      {s.label}
    </span>
  );
}
