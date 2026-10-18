import {
  Avatar as AvatarPrimitive,
  ScrollArea as ScrollPrimitive,
  Tabs as TabsPrimitive,
} from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

export function Avatar({
  initials,
  label,
  className,
}: {
  initials: string;
  label: string;
  className?: string;
}) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        'grid size-10 place-items-center rounded-full bg-primary-soft text-sm font-extrabold text-primary-strong',
        className,
      )}
      aria-label={label}
    >
      <AvatarPrimitive.Fallback>{initials}</AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

export function AvatarGroup({
  people,
}: {
  people: { id: string; initials: string; label: string }[];
}) {
  return (
    <div className="flex -space-x-2" aria-label="Grupo de pessoas">
      {people.map((person) => (
        <Avatar
          key={person.id}
          initials={person.initials}
          label={person.label}
          className="ring-2 ring-card"
        />
      ))}
    </div>
  );
}

export function ScrollArea({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ScrollPrimitive.Root className={cn('overflow-hidden', className)}>
      <ScrollPrimitive.Viewport className="h-full w-full">{children}</ScrollPrimitive.Viewport>
      <ScrollPrimitive.Scrollbar orientation="vertical" className="flex w-2 touch-none p-0.5">
        <ScrollPrimitive.Thumb className="flex-1 rounded-full bg-border" />
      </ScrollPrimitive.Scrollbar>
    </ScrollPrimitive.Root>
  );
}

export function Tabs({
  value,
  onValueChange,
  tabs,
}: {
  value: string;
  onValueChange: (value: string) => void;
  tabs: { id: string; label: string; content: ReactNode }[];
}) {
  return (
    <TabsPrimitive.Root value={value} onValueChange={onValueChange}>
      <TabsPrimitive.List className="flex gap-1 overflow-x-auto rounded-[14px] bg-muted p-1">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.id}
            value={tab.id}
            className="rounded-[10px] px-3 py-2 text-sm font-bold whitespace-nowrap text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-card"
          >
            {tab.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {tabs.map((tab) => (
        <TabsPrimitive.Content key={tab.id} value={tab.id} className="pt-4 focus:outline-none">
          {tab.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
