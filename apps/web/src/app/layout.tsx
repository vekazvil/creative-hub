import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';

import { Providers } from '@/components/providers';

import './globals.css';

// Fallback for non-Apple devices; Apple devices use SF Pro via the system font stack.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Creative Hub', template: '%s · Creative Hub' },
  description: 'Requests to the creative team',
};

export const viewport: Viewport = {
  themeColor: '#f5f5f7',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
