import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from '@/design-system/components/button';
import { cn } from '@/shared/utils/cn';

export function Breadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Trilha">
      <ol className="flex flex-wrap items-center gap-1 text-sm font-bold text-muted-foreground">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-1">
            {index > 0 ? <span aria-hidden>/</span> : null}
            {item.to ? (
              <Link to={item.to} className="hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Paginação">
      <Button
        variant="outline"
        size="sm"
        leftIcon={<ChevronLeft className="size-4" aria-hidden />}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Anterior
      </Button>
      <p className="text-sm font-bold">
        Página <span className="tabular">{page}</span> de{' '}
        <span className="tabular">{pageCount}</span>
      </p>
      <Button
        variant="outline"
        size="sm"
        rightIcon={<ChevronRight className="size-4" aria-hidden />}
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        Próxima
      </Button>
    </nav>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { id: T; label: string }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-[14px] bg-muted p-1">
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.id)}
            className={cn(
              'rounded-[10px] px-3 py-2 text-sm font-bold text-muted-foreground',
              selected && 'bg-card text-foreground shadow-card',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

const headerEase = [0.22, 1, 0.36, 1] as const;

export function PageHeader({
  title,
  accent,
  description,
  actions,
  badge,
}: {
  title: string;
  accent?: string;
  description?: ReactNode;
  actions?: ReactNode;
  badge?: string;
}) {
  const reduce = useReducedMotion();
  const descriptionText = typeof description === 'string' ? description : null;
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        {badge ? (
          <p className="mb-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">
            {badge}
          </p>
        ) : null}
        <h1 className="text-xl leading-none font-extrabold tracking-tight sm:text-[22px]">
          {title}
          {accent ? <span className="text-primary-strong"> {accent}</span> : null}
        </h1>
        {descriptionText ? (
          <motion.p
            key={descriptionText}
            className="mt-1.5 max-w-2xl text-sm font-semibold text-muted-foreground"
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: headerEase }}
          >
            {descriptionText}
          </motion.p>
        ) : description ? (
          <div className="mt-1.5 max-w-2xl text-sm font-semibold text-muted-foreground">
            {description}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
      ) : null}
    </header>
  );
}
