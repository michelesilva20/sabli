import { Dialog as DialogPrimitive } from 'radix-ui';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  side?: 'right' | 'left' | 'bottom';
  trigger?: ReactNode;
}

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  side = 'right',
  trigger,
}: SheetProps) {
  const position =
    side === 'bottom'
      ? 'sabli-sheet-bottom inset-x-0 bottom-0 max-h-[88dvh] rounded-t-[20px] p-5'
      : side === 'left'
        ? 'sabli-sheet-right inset-y-0 left-0 w-[min(100%,20rem)] overflow-y-auto p-4'
        : 'sabli-sheet-right inset-y-0 right-0 w-[min(100%,26rem)] overflow-y-auto p-6';
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="sabli-overlay fixed inset-0 z-50 bg-[#28212C]/45" />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-50 bg-card text-card-foreground shadow-pop focus:outline-none',
            position,
          )}
        >
          <DialogPrimitive.Title className="pr-8 text-lg font-extrabold">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description
            className={description ? 'mt-1 text-sm text-muted-foreground' : 'sr-only'}
          >
            {description ?? title}
          </DialogPrimitive.Description>
          <div className="mt-4">{children}</div>
          <DialogPrimitive.Close
            className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-[12px] hover:bg-muted"
            aria-label="Fechar"
          >
            <X className="size-4" aria-hidden />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function Drawer(props: Omit<SheetProps, 'side'>) {
  return <Sheet {...props} side="bottom" />;
}
