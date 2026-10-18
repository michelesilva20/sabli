import { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router';
import { SabliLogo } from '@/design-system/icons/logo';
import { formatTime } from '@/shared/domain/date';
import { KITCHEN_FLOW, KITCHEN_STATUS_LABEL } from '@/shared/domain/kitchen';
import { useDemoSession } from '@/shared/demo/session';
import { cn } from '@/shared/utils/cn';

const countTone: Record<string, string> = {
  waiting: 'bg-[#FF7055]/15 text-[#FFB1A3]',
  preparing: 'bg-[#9278FF]/15 text-[#C4B5FF]',
  ready: 'bg-[#3DBE78]/15 text-[#7EE0A8]',
  delivered: 'bg-white/8 text-[#D9D2E2]',
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
      className="tabular text-2xl leading-none font-extrabold tracking-tight text-white"
    >
      {formatTime(now)}
    </time>
  );
}

export function KitchenLayout() {
  const session = useDemoSession();

  return (
    <div className="kds min-h-dvh">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/8 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3 text-white">
          <SabliLogo />
          <span className="rounded-full bg-white/8 px-3 py-1 text-sm font-extrabold">Cozinha</span>
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
        <div className="flex items-center gap-3 text-sm font-bold text-[#D9D2E2]">
          <LiveClock />
          <span
            className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1"
            title="Indicador ilustrativo. Não há conexão com servidor."
          >
            <span className="size-2 rounded-full bg-accent" aria-hidden />
            Demonstração
          </span>
          <Link
            to="/inicio"
            className="rounded-full bg-white/10 px-3 py-1.5 font-extrabold text-white hover:bg-white/16"
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
