import { Search } from 'lucide-react';
import type { ComponentProps } from 'react';
import { fieldClass } from '@/design-system/components/form-field';
import { cn } from '@/shared/utils/cn';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(fieldClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(fieldClass, 'min-h-28 resize-y py-3', className)} {...props} />;
}

export function SearchInput({ className, ...props }: ComponentProps<'input'>) {
  return (
    <div className={cn('relative', className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input type="search" className={cn(fieldClass, 'pr-3 pl-10')} {...props} />
    </div>
  );
}
