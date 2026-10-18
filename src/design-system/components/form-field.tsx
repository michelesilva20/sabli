import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  description?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function fieldDescribedBy(id: string, description?: string, error?: string) {
  return [description ? `${id}-description` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ');
}

export function FormField({
  id,
  label,
  required,
  description,
  error,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('grid gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-bold text-foreground">
        {label}
        {required ? (
          <span className="text-danger" aria-hidden>
            {' '}
            *
          </span>
        ) : null}
        {required ? <span className="sr-only"> obrigatório</span> : null}
      </label>
      {children}
      {description ? (
        <p id={`${id}-description`} className="text-xs font-semibold text-muted-foreground">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-bold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const fieldClass =
  'h-11 w-full rounded-[12px] border border-input bg-card px-3 text-sm text-foreground shadow-none outline-none transition-colors duration-150 placeholder:text-muted-foreground focus-visible:border-primary-action focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 aria-[invalid=true]:border-danger';
