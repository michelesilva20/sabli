import { Toast as ToastPrimitive } from 'radix-ui';
import { useSyncExternalStore } from 'react';
import { cn } from '@/shared/utils/cn';

export interface ToastInput {
  title: string;
  description?: string;
  tone?: 'default' | 'success' | 'danger';
}

interface ToastItem extends ToastInput {
  id: string;
  tone: 'default' | 'success' | 'danger';
}

let toasts: ToastItem[] = [];
const listeners = new Set<() => void>();
const timers = new Map<string, number>();

function emit() {
  listeners.forEach((listener) => listener());
}

function dismiss(id: string) {
  const timer = timers.get(id);
  if (timer) window.clearTimeout(timer);
  timers.delete(id);
  toasts = toasts.filter((item) => item.id !== id);
  emit();
}

export function pushToast(input: ToastInput) {
  const id = crypto.randomUUID();
  toasts = [...toasts, { ...input, id, tone: input.tone ?? 'default' }];
  emit();
  timers.set(
    id,
    window.setTimeout(() => dismiss(id), 4200),
  );
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function ToastProvider() {
  const items = useSyncExternalStore(
    subscribe,
    () => toasts,
    () => toasts,
  );
  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={4200}>
      {items.map((item) => (
        <ToastPrimitive.Root
          key={item.id}
          duration={4200}
          onOpenChange={(open) => {
            if (!open) dismiss(item.id);
          }}
          className={cn(
            'sabli-pop grid gap-1 rounded-[16px] border border-border bg-card p-4 text-card-foreground shadow-pop',
            item.tone === 'success' && 'border-success/40',
            item.tone === 'danger' && 'border-danger/40',
          )}
        >
          <ToastPrimitive.Title className="text-sm font-extrabold">
            {item.title}
          </ToastPrimitive.Title>
          {item.description ? (
            <ToastPrimitive.Description className="text-xs text-muted-foreground">
              {item.description}
            </ToastPrimitive.Description>
          ) : null}
          <ToastPrimitive.Close className="sr-only">Fechar aviso</ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed right-4 bottom-4 z-[70] flex w-[min(100%-2rem,24rem)] flex-col gap-2 outline-none" />
    </ToastPrimitive.Provider>
  );
}
