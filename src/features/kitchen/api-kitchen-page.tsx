import { useState } from 'react';
import { Badge } from '@/design-system/components/badge';
import { Button } from '@/design-system/components/button';
import { Alert, EmptyState, Skeleton } from '@/design-system/components/feedback';
import { OrderItemComposition } from '@/features/ordering/order-item-composition';
import { ApiError } from '@/shared/api/http-client';
import { productionToKitchen, toPizzaComposition, type TicketResponse } from '@/shared/api/orders';
import { useAdvanceTicketItemMutation, useAdvanceTicketMutation, useKitchenTicketsQuery } from '@/shared/api/orders-queries';
import { canAdvanceKitchen, useAuthSession } from '@/shared/auth/session';
import { elapsedLabel, elapsedMinutes } from '@/shared/domain/date';
import {
  KITCHEN_ACTION_LABEL,
  KITCHEN_FLOW,
  KITCHEN_ITEM_STATUS_LABEL,
  KITCHEN_STATUS_LABEL,
} from '@/shared/domain/kitchen';
import { pushToast } from '@/design-system/components/toast';
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

function heat(createdAt: string, priority: TicketResponse['priority'], now: number) {
  const minutes = elapsedMinutes(createdAt, now);
  if (priority === 'HIGH' || minutes >= 15) return 'late';
  if (minutes >= 8) return 'aging';
  return 'fresh';
}

export function ApiKitchenPage() {
  const session = useAuthSession();
  const canAdvance = canAdvanceKitchen(session.context);
  const ticketsQuery = useKitchenTicketsQuery();
  const [focus, setFocus] = useState<(typeof KITCHEN_FLOW)[number] | 'all'>('all');
  const now = Date.now();
  const tickets = ticketsQuery.data?.items ?? [];
  const visible = KITCHEN_FLOW.filter((status) => focus === 'all' || focus === status);
  const error =
    ticketsQuery.error instanceof ApiError && ticketsQuery.error.code === 'TENANT_SUSPENDED'
      ? 'Estabelecimento suspenso.'
      : ticketsQuery.error instanceof ApiError && ticketsQuery.error.status === 403
        ? 'Acesso negado à fila da cozinha.'
        : ticketsQuery.isError
          ? 'Não foi possível carregar a fila.'
          : null;

  if (ticketsQuery.isLoading) {
    return <Skeleton className="h-[70vh]" />;
  }
  if (error) {
    return (
      <EmptyState
        title={error}
        description="Nenhum fixture de demonstração é usado como fallback."
        action={
          <Button variant="outline" onClick={() => void ticketsQuery.refetch()}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-4">
      {!canAdvance ? (
        <Alert title="Somente leitura para este papel">
          Você vê a fila. Avançar produção exige cozinha, gerência ou administração.
        </Alert>
      ) : null}
      <div className="flex gap-2 overflow-x-auto lg:hidden" role="tablist" aria-label="Colunas da cozinha">
        <button
          type="button"
          className={cn(
            'rounded-full px-3 py-2 text-sm font-extrabold',
            focus === 'all' ? 'bg-foreground text-background' : 'border border-border bg-card',
          )}
          onClick={() => setFocus('all')}
        >
          Todas ({tickets.length})
        </button>
        {KITCHEN_FLOW.map((status) => {
          const count = tickets.filter((ticket) => productionToKitchen(ticket.productionStatus) === status).length;
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
      <div className={cn('grid items-start gap-3', visible.length > 1 ? 'lg:grid-cols-4' : 'grid-cols-1')}>
        {visible.map((status) => {
          const column = tickets
            .filter((ticket) => productionToKitchen(ticket.productionStatus) === status)
            .sort((a, b) => {
              const rank = (ticket: TicketResponse) => (ticket.priority === 'HIGH' ? 0 : 1);
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
                  {column.length}
                </span>
              </h2>
              <div className="grid content-start gap-3">
                {column.length === 0 ? (
                  <p className="rounded-[16px] border border-dashed border-border px-3 py-8 text-center text-sm font-semibold text-muted-foreground">
                    Fila livre
                  </p>
                ) : (
                  column.map((ticket) => (
                    <ApiTicket key={ticket.id} ticket={ticket} now={now} canAdvance={canAdvance} />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ApiTicket({
  ticket,
  now,
  canAdvance,
}: {
  ticket: TicketResponse;
  now: number;
  canAdvance: boolean;
}) {
  const status = productionToKitchen(ticket.productionStatus);
  const action = KITCHEN_ACTION_LABEL[status];
  const minutes = elapsedMinutes(ticket.createdAt, now);
  const tone = heat(ticket.createdAt, ticket.priority, now);
  const done = status === 'delivered';
  const advanceTicket = useAdvanceTicketMutation();
  const advanceItem = useAdvanceTicketItemMutation();
  const busy = advanceTicket.isPending || advanceItem.isPending;

  function handleError(error: unknown) {
    if (error instanceof ApiError && error.code === 'STALE_VERSION') {
      pushToast({
        title: 'A fila mudou',
        description: 'Recarregue o ticket e tente de novo. Nada foi avançado por conta própria.',
        tone: 'danger',
      });
      return;
    }
    if (error instanceof ApiError && error.status === 403) {
      pushToast({ title: 'Sem permissão para avançar a produção', tone: 'danger' });
      return;
    }
    pushToast({
      title: error instanceof ApiError ? error.message : 'Não foi possível avançar o ticket',
      tone: 'danger',
    });
  }

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-[20px] border bg-card p-4 shadow-card',
        tone === 'late' ? 'border-primary-action/40' : 'border-border/70',
        ticket.priority === 'HIGH' && !done ? 'ring-1 ring-primary-action/30' : null,
        done && 'opacity-70',
      )}
    >
      <span className={cn('absolute inset-y-0 left-0 w-1.5', columnAccent[status])} aria-hidden />
      <header className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <p className="text-2xl leading-none font-extrabold tracking-tight">#{ticket.number}</p>
          <p className="mt-2 inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-extrabold">{ticket.origin}</p>
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
          <p className="mt-2 text-xs font-bold text-muted-foreground">
            {done ? 'Concluído' : minutes < 8 ? 'No tempo' : 'Em fila'}
          </p>
        </div>
      </header>
      <ul className="mt-4 grid gap-2.5 pl-2">
        {ticket.items.map((item) => {
          const itemStatus = productionToKitchen(item.productionStatus);
          const itemAction = KITCHEN_ACTION_LABEL[itemStatus];
          return (
            <li key={item.ticketItemId ?? item.id} className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-muted text-sm font-extrabold">
                {item.quantity}
              </span>
              <span className="min-w-0 flex-1 pt-0.5">
                <OrderItemComposition
                  name={item.productName ?? 'Item'}
                  notes={item.notes ?? undefined}
                  pizza={toPizzaComposition(item.pizza)}
                  nameClassName="text-[15px] leading-snug"
                />
                <span className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">{KITCHEN_ITEM_STATUS_LABEL[itemStatus]}</Badge>
                  {canAdvance && itemAction && item.ticketItemId ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-xs"
                      loading={advanceItem.isPending}
                      disabled={busy}
                      aria-label={`Avançar ${item.productName ?? 'item'}`}
                      onClick={() =>
                        advanceItem.mutate(
                          { ticketId: ticket.id, itemId: item.ticketItemId!, version: item.ticketItemVersion },
                          { onError: handleError },
                        )
                      }
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
      {canAdvance && action ? (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            advanceTicket.mutate({ ticketId: ticket.id, version: ticket.version }, { onError: handleError })
          }
          className={cn(
            'mt-4 h-12 w-full rounded-[14px] text-sm font-extrabold transition-[filter,background-color] duration-150 disabled:opacity-60',
            actionClass[status],
          )}
        >
          {advanceTicket.isPending ? 'Confirmando…' : action}
        </button>
      ) : done ? (
        <p className="mt-4 pl-2 text-xs font-extrabold text-success">Entregue</p>
      ) : null}
    </article>
  );
}

