'use client';

import { MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';

import { Toaster } from '@/components/ui/sonner';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}>
      {children}
      <Toaster position="top-center" />
    </MotionConfig>
  );
}
