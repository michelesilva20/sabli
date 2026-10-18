import { Dialog as DialogPrimitive } from 'radix-ui';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  trigger?: ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  trigger,
  className,
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="sabli-overlay fixed inset-0 z-50 bg-[#28212C]/45" />
        <DialogPrimitive.Content
          className={cn(
            'sabli-dialog fixed top-1/2 left-1/2 z-50 w-[min(100%-2rem,32rem)] rounded-[20px] bg-card p-6 text-card-foreground shadow-pop focus:outline-none',
            className,
          )}
        >
          <DialogPrimitive.Title className="pr-8 text-xl font-extrabold tracking-tight">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description
            className={description ? 'mt-1 text-sm text-muted-foreground' : 'sr-only'}
          >
            {description ?? title}
          </DialogPrimitive.Description>
          <div className="mt-4">{children}</div>
          {footer ? <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div> : null}
          <DialogPrimitive.Close
            className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-[12px] text-muted-foreground hover:bg-muted"
            aria-label="Fechar"
          >
            <X className="size-4" aria-hidden />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
