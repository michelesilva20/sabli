import {
  DropdownMenu as Menu,
  Popover as PopoverPrimitive,
  Tooltip as TooltipPrimitive,
} from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

const panel =
  'sabli-pop z-50 rounded-[12px] border border-border bg-popover p-1 text-popover-foreground shadow-pop';

export function TooltipProvider({ children }: { children: ReactNode }) {
  return <TooltipPrimitive.Provider delayDuration={250}>{children}</TooltipPrimitive.Provider>;
}

export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          sideOffset={8}
          className="sabli-pop z-50 rounded-[12px] bg-foreground px-2.5 py-1.5 text-xs font-bold text-background shadow-pop"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export function Popover({
  trigger,
  children,
  align = 'end',
  labelledBy,
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  labelledBy?: string;
}) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          sideOffset={8}
          aria-labelledby={labelledBy}
          className={cn(panel, 'w-72 p-3')}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export interface MenuItem {
  id: string;
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}

export function DropdownMenu({
  trigger,
  items,
  label,
}: {
  trigger: ReactNode;
  items: MenuItem[];
  label: string;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>{trigger}</Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align="end"
          sideOffset={8}
          aria-label={label}
          className={cn(panel, 'min-w-52')}
        >
          {items.map((item) => (
            <Menu.Item
              key={item.id}
              onSelect={item.onSelect}
              className={cn(
                'cursor-pointer rounded-[10px] px-3 py-2 text-sm font-bold outline-none data-[highlighted]:bg-muted',
                item.destructive && 'text-danger',
              )}
            >
              {item.label}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
