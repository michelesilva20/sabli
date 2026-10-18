import { AlertDialog as AlertPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';
import { Button } from '@/design-system/components/button';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'primary' | 'destructive';
  onConfirm: () => void;
  trigger?: ReactNode;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  tone = 'primary',
  onConfirm,
  trigger,
}: ConfirmationDialogProps) {
  return (
    <AlertPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <AlertPrimitive.Trigger asChild>{trigger}</AlertPrimitive.Trigger> : null}
      <AlertPrimitive.Portal>
        <AlertPrimitive.Overlay className="sabli-overlay fixed inset-0 z-50 bg-[#28212C]/45" />
        <AlertPrimitive.Content className="sabli-dialog fixed top-1/2 left-1/2 z-50 w-[min(100%-2rem,28rem)] rounded-[20px] bg-card p-6 text-card-foreground shadow-pop focus:outline-none">
          <AlertPrimitive.Title className="text-xl font-extrabold">{title}</AlertPrimitive.Title>
          <AlertPrimitive.Description className="mt-2 text-sm text-muted-foreground">
            {description}
          </AlertPrimitive.Description>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <AlertPrimitive.Cancel asChild>
              <Button variant="outline">{cancelLabel}</Button>
            </AlertPrimitive.Cancel>
            <AlertPrimitive.Action asChild>
              <Button
                variant={tone === 'destructive' ? 'destructive' : 'primary'}
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
            </AlertPrimitive.Action>
          </div>
        </AlertPrimitive.Content>
      </AlertPrimitive.Portal>
    </AlertPrimitive.Root>
  );
}

export function AlertDialog(props: ConfirmationDialogProps) {
  return <ConfirmationDialog {...props} />;
}
