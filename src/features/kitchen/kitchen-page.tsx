import { useEffect, useState } from 'react';
import { KITCHEN_ACTION_LABEL, KITCHEN_FLOW, KITCHEN_STATUS_LABEL } from '@/shared/domain/kitchen';
import { elapsedLabel, elapsedMinutes } from '@/shared/domain/date';
import { demoSession, useDemoSession, type LiveTicket } from '@/shared/demo/session';
import { cn } from '@/shared/utils/cn';

const columnAccent: Record<string, string> = {
  waiting: 'bg-[#FF7055]',
  preparing: 'bg-[#9278FF]',
  ready: 'bg-[#3DBE78]',
  delivered: 'bg-[#6B6574]',
};

const actionClass: Record<string, string> = {
  waiting: 'bg-primary-action text-primary-action-foreground hover:brightness-110',
  preparing: 'bg-accent text-accent-foreground hover:brightness-105',
  ready: 'bg-success text-success-foreground hover:brightness-110',
};

function heat(ticket: LiveTicket, now: number) {
  const minutes = elapsedMinutes(ticket.createdAt, now);
  if (ticket.priority === 'high' || minutes >= 15) return 'late';
  if (minutes >= 8) return 'aging';
  return 'fresh';
}

function Ticket({ ticket, now }: { ticket: LiveTicket; now: number }) {
  const action = KITCHEN_ACTION_LABEL[ticket.status];
  const minutes = elapsedMinutes(ticket.createdAt, now);
  const tone = heat(ticket, now);
  const done = ticket.status === 'delivered';

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-[20px] border bg-card p-4 shadow-card',
        tone === 'late' ? 'border-[#FF7055]/50' : 'border-white/8',
        ticket.priority === 'high' && !done ? 'ring-1 ring-[#FF7055]/40' : null,
        done && 'opacity-70',
      )}
    >
      <span
        className={cn('absolute inset-y-0 left-0 w-1.5', columnAccent[ticket.status])}
        aria-hidden
      />
      <header className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <p className="text-2xl leading-none font-extrabold tracking-tight">#{ticket.number}</p>
          <p className="mt-2 inline-flex rounded-full bg-white/8 px-2.5 py-1 text-xs font-extrabold text-[#E8E1F0]">
            {ticket.origin}
          </p>
        </div>
        <div className="text-right">
          <p
            className={cn(
              'tabular text-lg leading-none font-extrabold',
              tone === 'late' && 'text-[#FF7055]',
              tone === 'aging' && 'text-[#F5C16C]',
              tone === 'fresh' && 'text-[#D9D2E2]',
            )}
          >
            {elapsedLabel(ticket.createdAt, now)}
          </p>
          {ticket.priority === 'high' && !done ? (
            <p className="mt-2 text-xs font-extrabold tracking-wide text-[#FF7055] uppercase">
              Prioridade
            </p>
          ) : (
            <p className="mt-2 text-xs font-bold text-[#8E8798]">
              {done ? 'Concluído' : minutes < 8 ? 'No tempo' : 'Em fila'}
            </p>
          )}
        </div>
      </header>
      <ul className="mt-4 grid gap-2.5 pl-2">
        {ticket.items.map((item) => (
          <li key={`${ticket.id}-${item.name}`} className="flex items-start gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-white/10 text-sm font-extrabold">
              {item.quantity}
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="block text-[15px] leading-snug font-extrabold">{item.name}</span>
              {item.notes ? (
                <span className="mt-0.5 block text-xs font-semibold text-[#A89FB0]">
                  {item.notes}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      {action ? (
        <button
          type="button"
          onClick={() => demoSession.advanceTicket(ticket.id)}
          className={cn(
            'mt-4 h-12 w-full rounded-[14px] text-sm font-extrabold transition-[filter] duration-150',
            actionClass[ticket.status],
          )}
        >
          {action}
        </button>
      ) : (
        <p className="mt-4 pl-2 text-xs font-extrabold text-[#7EE0A8]">
          Entregue nesta demonstração
        </p>
      )}
    </article>
  );
}

export function KitchenPage() {
  const session = useDemoSession();
  const [now, setNow] = useState(() => Date.now());
  const [focus, setFocus] = useState<(typeof KITCHEN_FLOW)[number] | 'all'>('all');

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const visible = KITCHEN_FLOW.filter((status) => focus === 'all' || focus === status);

  return (
    <div className="grid gap-4">
      <div
        className="flex gap-2 overflow-x-auto lg:hidden"
        role="tablist"
        aria-label="Colunas da cozinha"
      >
        <button
          type="button"
          className={cn(
            'rounded-full px-3 py-2 text-sm font-extrabold',
            focus === 'all' ? 'bg-white text-[#12111A]' : 'bg-white/8',
          )}
          onClick={() => setFocus('all')}
        >
          Todas ({session.tickets.length})
        </button>
        {KITCHEN_FLOW.map((status) => {
          const count = session.tickets.filter((ticket) => ticket.status === status).length;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setFocus(status)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-extrabold',
                focus === status ? 'bg-white text-[#12111A]' : 'bg-white/8',
              )}
            >
              <span className={cn('size-2 rounded-full', columnAccent[status])} aria-hidden />
              {KITCHEN_STATUS_LABEL[status]} ({count})
            </button>
          );
        })}
      </div>
      <div
        className={cn(
          'grid items-start gap-3',
          visible.length > 1 ? 'lg:grid-cols-4' : 'grid-cols-1',
        )}
      >
        {visible.map((status) => {
          const tickets = session.tickets
            .filter((ticket) => ticket.status === status)
            .sort((a, b) => {
              const rank = (ticket: LiveTicket) => (ticket.priority === 'high' ? 0 : 1);
              const byPriority = rank(a) - rank(b);
              if (byPriority !== 0) return byPriority;
              return Date.parse(a.createdAt) - Date.parse(b.createdAt);
            });
          return (
            <section
              key={status}
              aria-label={KITCHEN_STATUS_LABEL[status]}
              className="min-h-[70vh] rounded-[24px] bg-surface p-3"
            >
              <h2 className="mb-3 flex items-center justify-between gap-2 px-1 text-sm font-extrabold">
                <span className="inline-flex items-center gap-2">
                  <span className={cn('size-2.5 rounded-full', columnAccent[status])} aria-hidden />
                  {KITCHEN_STATUS_LABEL[status]}
                </span>
                <span className="tabular rounded-full bg-white/8 px-2 py-0.5 text-xs">
                  {tickets.length}
                </span>
              </h2>
              <div className="grid content-start gap-3">
                {tickets.length === 0 ? (
                  <p className="rounded-[16px] border border-dashed border-white/10 px-3 py-8 text-center text-sm font-semibold text-[#8E8798]">
                    Fila livre
                  </p>
                ) : (
                  tickets.map((ticket) => <Ticket key={ticket.id} ticket={ticket} now={now} />)
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
