'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Logo } from '@/components/brand/logo';

/** Centered card layout shared by every sign-in screen. */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center bg-surface px-4 py-10 sm:justify-center sm:py-16">
      <Link href="/" className="mb-10 rounded-lg focus-visible:ring-4 focus-visible:ring-ring/25">
        <Logo />
      </Link>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-[420px] rounded-3xl bg-card p-7 shadow-(--shadow-card) sm:p-10"
      >
        <h1 className="text-[28px] leading-tight font-semibold">{title}</h1>
        {description && (
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{description}</p>
        )}
        <div className="mt-8">{children}</div>
      </motion.div>
      {footer && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mt-6 text-[15px] text-muted-foreground"
        >
          {footer}
        </motion.div>
      )}
    </main>
  );
}
