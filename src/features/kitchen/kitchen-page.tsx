import { useEffect, useState } from 'react';
import { Button } from '@/design-system/components/button';
import { Badge } from '@/design-system/components/badge';
import {
  KITCHEN_ACTION_LABEL,
  KITCHEN_FLOW,
  KITCHEN_ITEM_STATUS_LABEL,
  KITCHEN_STATUS_LABEL,
  itemKitchenStatus,
} from '@/shared/domain/kitchen';
import { elapsedLabel, elapsedMinutes } from '@/shared/domain/date';
import { OrderItemComposition } from '@/features/ordering/order-item-composition';
import { demoSession, useDemoSession, type LiveTicket } from '@/shared/demo/session';
import { cn } from '@/shared/utils/cn';

const columnAccent: Record<string, string> = {
  waiting: 'bg-primary-action',
  preparing: 'bg-secondary',
  ready: 'bg-success',
  delivered: 'bg-muted-foreground',
};

const actionClass: Record<string, string> = {
  waiting: 'bg-primary-action text-primary-action-foreground hover:bg-primary-hover',
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
        tone === 'late' ? 'border-primary-action/40' : 'border-border/70',
        ticket.priority === 'high' && !done ? 'ring-1 ring-primary-action/30' : null,
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
          <p className="mt-2 inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-extrabold">
            {ticket.origin}
          </p>
        </div>
        <div className="text-right">
          <p
            className={cn(
              'tabular text-lg leading-none font-extrabold',
              tone === 'late' && 'text-primary-action',
              tone === 'aging' && 'text-warning',
              tone === 'fresh' && 'text-muted-foreground',
            )}
          >
            {elapsedLabel(ticket.createdAt, now)}
          </p>
          {ticket.priority === 'high' && !done ? (
            <p className="mt-2 text-xs font-extrabold tracking-wide text-primary-action uppercase">
              Prioridade
            </p>
          ) : (
            <p className="mt-2 text-xs font-bold text-muted-foreground">
              {done ? 'Concluído' : minutes < 8 ? 'No tempo' : 'Em fila'}
            </p>
          )}
        </div>
      </header>
      <ul className="mt-4 grid gap-2.5 pl-2">
        {ticket.items.map((item) => {
          const itemStatus = itemKitchenStatus(item, ticket.status);
          const itemAction = KITCHEN_ACTION_LABEL[itemStatus];
          return (
            <li key={item.lineId} className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-muted text-sm font-extrabold">
                {item.quantity}
              </span>
              <span className="min-w-0 flex-1 pt-0.5">
                <OrderItemComposition
                  name={item.name}
                  notes={item.notes}
                  pizza={item.pizza}
                  nameClassName="text-[15px] leading-snug"
                />
                <span className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">{KITCHEN_ITEM_STATUS_LABEL[itemStatus]}</Badge>
                  {itemAction ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-xs"
                      aria-label={`Avançar ${item.name}`}
                      onClick={() => demoSession.advanceTicketItem(ticket.id, item.lineId)}
                    >
                      {itemAction}
                    </Button>
                  ) : null}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      {action ? (
        <button
          type="button"
          onClick={() => demoSession.advanceTicket(ticket.id)}
          className={cn(
            'mt-4 h-12 w-full rounded-[14px] text-sm font-extrabold transition-[filter,background-color] duration-150',
            actionClass[ticket.status],
          )}
        >
          {action}
        </button>
      ) : (
        <p className="mt-4 pl-2 text-xs font-extrabold text-success">Entregue nesta demonstração</p>
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
            focus === 'all' ? 'bg-foreground text-background' : 'border border-border bg-card',
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
                focus === status ? 'bg-foreground text-background' : 'border border-border bg-card',
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
              className="min-h-[70vh] rounded-[24px] bg-surface-muted p-3"
            >
              <h2 className="mb-3 flex items-center justify-between gap-2 px-1 text-sm font-extrabold">
                <span className="inline-flex items-center gap-2">
                  <span className={cn('size-2.5 rounded-full', columnAccent[status])} aria-hidden />
                  {KITCHEN_STATUS_LABEL[status]}
                </span>
                <span className="tabular rounded-full bg-card px-2 py-0.5 text-xs text-muted-foreground">
                  {tickets.length}
                </span>
              </h2>
              <div className="grid content-start gap-3">
                {tickets.length === 0 ? (
                  <p className="rounded-[16px] border border-dashed border-border px-3 py-8 text-center text-sm font-semibold text-muted-foreground">
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
