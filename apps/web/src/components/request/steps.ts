export type Step = { label: string; caption: string; href?: string };

export const REQUEST_STEPS = (id?: string): Step[] => [
  { caption: 'Step 1', label: 'What you need', href: '/requests/new' },
  { caption: 'Step 2', label: 'Details', href: id ? `/requests/${id}` : undefined },
  { caption: 'Step 3', label: 'Check and send' },
];

/** A public link (`base` = /l/<token>): first choose how to start, our forms or a form AI builds. */
export const PUBLIC_STEPS = (
  base: string,
  opts: { path?: 'forms' | 'ai'; id?: string } = {},
): Step[] => [
  { caption: 'Step 1', label: 'How to start', href: base },
  {
    caption: 'Step 2',
    label: opts.path === 'ai' ? 'Describe it' : 'What you need',
    href: `${base}/${opts.path ?? 'forms'}`,
  },
  { caption: 'Step 3', label: 'Details', href: opts.id ? `${base}/r/${opts.id}` : undefined },
  { caption: 'Step 4', label: 'Check and send' },
];
