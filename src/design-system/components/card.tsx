import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cn(
        'rounded-[20px] border border-border/70 bg-card text-card-foreground shadow-card transition-[background-color,border-color,color,box-shadow] duration-200',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <header className={cn('flex items-start justify-between gap-3 px-5 pt-5', className)}>
      {children}
    </header>
  );
}

export function CardTitle({ className, children }: { className?: string; children: ReactNode }) {
  return <h3 className={cn('text-base font-extrabold tracking-tight', className)}>{children}</h3>;
}

export function CardDescription({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <p className={cn('text-sm text-muted-foreground', className)}>{children}</p>;
}

export function CardContent({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>;
}

export function CardFooter({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <footer className={cn('flex items-center justify-end gap-2 px-5 pb-5', className)}>
      {children}
    </footer>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  delta?: number;
  hint: string;
  icon: ReactNode;
  tone?: 'coral' | 'purple' | 'lime' | 'neutral';
  delay?: number;
}

const tones = {
  coral: 'bg-primary-action text-primary-action-foreground',
  purple: 'bg-secondary text-secondary-foreground',
  lime: 'bg-accent text-accent-foreground',
  neutral: 'bg-foreground text-background',
};

export function MetricCard({
  label,
  value,
  delta,
  hint,
  icon,
  tone = 'coral',
  delay = 0,
}: MetricCardProps) {
  const positive = (delta ?? 0) >= 0;
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="h-full"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="h-full transition duration-150 ease-out hover:-translate-y-0.5 hover:shadow-pop motion-reduce:transform-none">
        <CardContent className="flex h-full items-center gap-3 py-4">
          <span
            className={cn('grid size-11 shrink-0 place-items-center rounded-[14px]', tones[tone])}
          >
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-bold text-muted-foreground">{label}</p>
              {delta !== undefined ? (
                <span
                  className={cn(
                    'shrink-0 text-xs font-extrabold',
                    positive ? 'text-success' : 'text-danger',
                  )}
                >
                  {positive ? '▲' : '▼'} {Math.abs(delta)}%
                </span>
              ) : null}
            </div>
            <p className="tabular mt-1 text-xl leading-none font-extrabold tracking-tight">
              {value}
            </p>
            {hint ? (
              <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">{hint}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function StatCard(props: MetricCardProps) {
  return <MetricCard {...props} />;
}
