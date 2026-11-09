'use client';

import { CircleCheck, Info, Loader2, OctagonX, TriangleAlert } from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      icons={{
        success: <CircleCheck className="size-4 text-success" />,
        info: <Info className="size-4" />,
        warning: <TriangleAlert className="size-4" />,
        error: <OctagonX className="size-4 text-destructive" />,
        loading: <Loader2 className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            '!rounded-2xl !border-border !bg-popover !text-popover-foreground !shadow-(--shadow-float) !text-[15px]',
        },
      }}
      {...props}
    />
  );
}
