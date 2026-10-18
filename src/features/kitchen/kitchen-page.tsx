import { useEffect, useState } from 'react';
import { KITCHEN_ACTION_LABEL, KITCHEN_FLOW, KITCHEN_STATUS_LABEL } from '@/shared/domain/kitchen';
import { elapsedLabel } from '@/shared/domain/date';
import { demoSession, useDemoSession, type LiveTicket } from '@/shared/demo/session';
import { cn } from '@/shared/utils/cn';

const columnTone: Record<string, string> = {
  waiting: 'bg-[#C73D2A]',
  preparing: 'bg-[#6C4CF5]',
  ready: 'bg-[#1F7A45]',
  delivered: 'bg-[#3A3544]',
};

function Ticket({ ticket, now }: { ticket: LiveTicket; now: number }) {
  const action = KITCHEN_ACTION_LABEL[ticket.status];
  return (
    <article className="grid gap-3 rounded-[16px] bg-white p-4 text-[#28212C] shadow-card">
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-extrabold">#{ticket.number}</p>
          <p className="text-xs font-bold text-[#746C78]">{ticket.origin}</p>
        </div>
        <div className="text-right">
          <p className="tabular text-sm font-extrabold">{elapsedLabel(ticket.createdAt, now)}</p>
          {ticket.priority === 'high' ? (
            <p className="text-xs font-extrabold text-[#A33324]">Prioridade</p>
          ) : (
            <p className="text-xs font-bold text-[#746C78]">Normal</p>
          )}
        </div>
      </header>
      <ul className="grid gap-1 text-sm">
        {ticket.items.map((item) => (
          <li key={`${ticket.id}-${item.name}`}>
            <span className="font-extrabold">
              {item.quantity}× {item.name}
            </span>
            {item.notes ? <span className="block text-xs text-[#746C78]">{item.notes}</span> : null}
          </li>
        ))}
      </ul>
      {action ? (
        <button
          type="button"
          onClick={() => demoSession.advanceTicket(ticket.id)}
          className="h-11 rounded-[12px] bg-[#C73D2A] text-sm font-extrabold text-white"
        >
          {action}
        </button>
      ) : (
        <p className="text-xs font-bold text-[#1F7A45]">Entregue nesta demonstração</p>
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
          className="rounded-full bg-white/10 px-3 py-2 text-sm font-extrabold"
          onClick={() => setFocus('all')}
        >
          Todas ({session.tickets.length})
        </button>
        {KITCHEN_FLOW.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFocus(status)}
            className={cn(
              'rounded-full px-3 py-2 text-sm font-extrabold text-white',
              columnTone[status],
            )}
          >
            {KITCHEN_STATUS_LABEL[status]}
          </button>
        ))}
      </div>
      <div className={cn('grid gap-3', visible.length > 1 ? 'lg:grid-cols-4' : 'grid-cols-1')}>
        {visible.map((status) => {
          const tickets = session.tickets.filter((ticket) => ticket.status === status);
          return (
            <section
              key={status}
              aria-label={KITCHEN_STATUS_LABEL[status]}
              className="grid content-start gap-3"
            >
              <h2
                className={cn(
                  'rounded-[14px] px-3 py-2 text-sm font-extrabold text-white',
                  columnTone[status],
                )}
              >
                {KITCHEN_STATUS_LABEL[status]} ({tickets.length})
              </h2>
              {tickets.map((ticket) => (
                <Ticket key={ticket.id} ticket={ticket} now={now} />
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
