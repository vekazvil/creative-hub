import type { Metadata } from 'next';

import { NewRequest } from './new-request';

export const metadata: Metadata = { title: 'New request' };

export default function NewRequestPage() {
  return <NewRequest />;
}
