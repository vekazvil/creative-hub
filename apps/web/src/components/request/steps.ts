export type Step = { label: string; caption: string; href?: string };

export const REQUEST_STEPS = (id?: string): Step[] => [
  { caption: 'Step 1', label: 'What you need', href: '/requests/new' },
  { caption: 'Step 2', label: 'Details', href: id ? `/requests/${id}` : undefined },
  { caption: 'Step 3', label: 'Check and send' },
];
