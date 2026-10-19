import { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router';
import { ThemeSwitcher } from '@/design-system/components/theme-switcher';
import { SabliLogo } from '@/design-system/icons/logo';
import { formatTime } from '@/shared/domain/date';
import { KITCHEN_FLOW, KITCHEN_STATUS_LABEL } from '@/shared/domain/kitchen';
import { ApiUnavailableState } from '@/features/auth/api-unavailable-state';
import { isApiMode } from '@/shared/config/runtime';
import { useDemoSession } from '@/shared/demo/session';
import { cn } from '@/shared/utils/cn';

const countTone: Record<string, string> = {
  waiting: 'bg-primary-soft text-primary-strong',
  preparing: 'bg-secondary-soft text-secondary',
  ready: 'bg-success-soft text-success',
  delivered: 'bg-muted text-muted-foreground',
};

function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <time
      dateTime={now.toISOString()}
      className="tabular text-2xl leading-none font-extrabold tracking-tight"
    >
      {formatTime(now)}
    </time>
  );
}

export function KitchenLayout() {
  if (isApiMode()) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-4 sm:px-6">
          <SabliLogo />
          <Link
            to="/inicio"
            className="rounded-full bg-muted px-3 py-1.5 text-sm font-extrabold hover:bg-muted/80"
          >
            Painel
          </Link>
        </header>
        <main id="conteudo" className="px-4 py-5 sm:px-6">
          <ApiUnavailableState module="kitchen" />
        </main>
      </div>
    );
  }
  return <DemoKitchenLayout />;
}

function DemoKitchenLayout() {
  const session = useDemoSession();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <SabliLogo />
          <span className="rounded-full bg-muted px-3 py-1 text-sm font-extrabold">Cozinha</span>
        </div>
        <ul className="hidden items-center gap-2 md:flex">
          {KITCHEN_FLOW.map((status) => {
            const count = session.tickets.filter((ticket) => ticket.status === status).length;
            return (
              <li
                key={status}
                className={cn('rounded-full px-3 py-1.5 text-xs font-extrabold', countTone[status])}
              >
                {KITCHEN_STATUS_LABEL[status]} · {count}
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-3 text-sm font-bold">
          <LiveClock />
          <ThemeSwitcher compact />
          <span
            className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1"
            title="Indicador ilustrativo. Não há conexão com servidor."
          >
            <span className="size-2 rounded-full bg-accent" aria-hidden />
            Demonstração
          </span>
          <Link
            to="/inicio"
            className="rounded-full bg-muted px-3 py-1.5 font-extrabold hover:bg-muted/80"
          >
            Painel
          </Link>
        </div>
      </header>
      <main id="conteudo" className="px-4 py-5 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
