import { Banknote, Clock, Receipt, Store } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { StatusBadge } from '@/design-system/components/badge';
import { Button } from '@/design-system/components/button';
import { Alert, EmptyState, Skeleton } from '@/design-system/components/feedback';
import { PageHeader } from '@/design-system/components/navigation';
import { Sheet } from '@/design-system/components/sheet';
import { pushToast } from '@/design-system/components/toast';
import { BillSummary } from '@/features/cash/api-bill-panel';
import {
  BILL_STATUS_LABEL,
  billChannelLabel,
} from '@/shared/api/billing';
import {
  financeErrorMessage,
  useOpenAccountsQuery,
  type OpenAccount,
  type OpenAccountFilter,
} from '@/shared/api/billing-queries';
import { useRequestBillMutation } from '@/shared/api/dining-queries';
import { ApiError } from '@/shared/api/http-client';
import {
  canFinance,
  canOperateDining,
  canReadBill,
  useAuthSession,
} from '@/shared/auth/session';
import { elapsedLabel } from '@/shared/domain/date';
import { formatBRL } from '@/shared/domain/money';
import { cn } from '@/shared/utils/cn';

const filterTitle: Record<OpenAccountFilter, string> = {
  all: 'Abertas agora',
  occupied: 'Em atendimento',
  awaiting_bill: 'Aguardando conta',
  counter: 'Balcão',
};

export function ApiChecksPage() {
  const session = useAuthSession();
  const canRead = canReadBill(session.context);
  const canOperate = canOperateDining(session.context);
  const canPay = canFinance(session.context);
  const navigate = useNavigate();
  const accountsQuery = useOpenAccountsQuery();
  const billMutation = useRequestBillMutation();
  const [filter, setFilter] = useState<OpenAccountFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches,
  );

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1280px)');
    const apply = () => {
      setWide(query.matches);
      if (query.matches) setDetailOpen(false);
    };
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  const accounts = accountsQuery.accounts;
  const counts = useMemo(() => {
    const occupied = accounts.filter((item) => item.occupancy === 'occupied').length;
    const awaiting = accounts.filter((item) => item.occupancy === 'awaiting_bill').length;
    const openCents = accounts
      .filter((item) => !item.bill.settled)
      .reduce((sum, item) => sum + item.bill.remainingCents, 0);
    return { occupied, awaiting, openCents };
  }, [accounts]);
  const visible =
    filter === 'all' ? accounts : accounts.filter((item) => item.occupancy === filter);
  const selected = visible.find((item) => item.key === selectedId) ?? visible[0] ?? null;
  const error = accountsQuery.error;
  const forbidden = error instanceof ApiError && error.status === 403;

  const applyFilter = (next: OpenAccountFilter) => {
    setFilter((current) => (current === next ? 'all' : next));
  };

  const choose = (id: string) => {
    setSelectedId(id);
    if (!wide) setDetailOpen(true);
  };

  if (!canRead || forbidden) {
    return (
      <div className="grid gap-4">
        <PageHeader title="Comandas" description="Contas persistidas deste estabelecimento." />
        <EmptyState
          title="Acesso negado"
          description="A cozinha não consulta comandas. Peça a um operador de salão ou caixa."
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Comandas"
        description="Contas reais do estabelecimento autorizado. Totais vêm do servidor."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Em atendimento"
          value={String(counts.occupied)}
          icon={<Clock className="size-5" />}
          tone="bg-secondary text-secondary-foreground"
          active={filter === 'occupied'}
          onClick={() => applyFilter('occupied')}
        />
        <Stat
          label="Aguardando conta"
          value={String(counts.awaiting)}
          icon={<Receipt className="size-5" />}
          tone="bg-primary-action text-primary-action-foreground"
          active={filter === 'awaiting_bill'}
          onClick={() => applyFilter('awaiting_bill')}
        />
        <button
          type="button"
          onClick={() => applyFilter('counter')}
          aria-pressed={filter === 'counter'}
          className={cn(
            'flex items-center gap-3 rounded-[16px] border bg-card px-4 py-3 text-left shadow-card',
            filter === 'counter' ? 'border-foreground' : 'border-border/70',
          )}
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-foreground text-background">
            <Banknote className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-bold text-muted-foreground">Em aberto</span>
            <span className="mt-0.5 block text-xl leading-none font-extrabold tabular-nums">
              {formatBRL(counts.openCents)}
            </span>
          </span>
        </button>
      </div>
      {error && !forbidden ? (
        <Alert title="Não foi possível carregar as comandas" tone="danger">
          {financeErrorMessage(error)}
        </Alert>
      ) : null}
      {accountsQuery.pending ? (
        <Skeleton className="h-64" />
      ) : accounts.length === 0 ? (
        <EmptyState
          title="Nenhuma comanda aberta"
          description="Quando um atendimento ou venda de balcão for confirmado, a conta aparece aqui."
        />
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="overflow-hidden rounded-[20px] border border-border/70 bg-card shadow-card">
            <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h2 className="text-sm font-extrabold">{filterTitle[filter]}</h2>
              <p className="text-xs font-bold text-muted-foreground">
                {visible.length} {visible.length === 1 ? 'conta' : 'contas'}
              </p>
            </header>
            {visible.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm font-semibold text-muted-foreground">
                Nenhuma conta neste filtro.
              </p>
            ) : (
              <ul>
                {visible.map((account) => {
                  const awaiting = account.occupancy === 'awaiting_bill';
                  const active = selected?.key === account.key;
                  const preview = account.bill.orders[0]?.items[0];
                  return (
                    <li key={account.key} className="border-b border-border last:border-b-0">
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => choose(account.key)}
                        className={cn(
                          'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-150',
                          active ? 'bg-muted' : 'hover:bg-muted/60',
                        )}
                      >
                        <span
                          className={cn(
                            'grid size-12 shrink-0 place-items-center rounded-[14px] text-sm font-extrabold tabular-nums',
                            account.occupancy === 'counter'
                              ? 'bg-foreground text-background'
                              : awaiting
                                ? 'bg-primary-action text-primary-action-foreground'
                                : 'bg-secondary text-secondary-foreground',
                          )}
                        >
                          {account.occupancy === 'counter' ? (
                            <Store className="size-5" />
                          ) : (
                            String(account.bill.tableNumber ?? 0).padStart(2, '0')
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="font-extrabold">{billChannelLabel(account.bill)}</span>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-extrabold">
                              {BILL_STATUS_LABEL[account.bill.status]}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-xs font-semibold text-muted-foreground">
                            {account.openedAt ? elapsedLabel(account.openedAt) : 'agora'}
                            {preview
                              ? ` · ${preview.quantity}× ${preview.productName ?? 'item'}`
                              : ''}
                          </span>
                        </span>
                        <span className="tabular shrink-0 text-base font-extrabold">
                          {formatBRL(account.bill.remainingCents)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          {selected ? (
            <aside className="sticky top-20 hidden xl:block">
              <section className="rounded-[20px] border border-border/70 bg-card p-5 shadow-card">
                <CheckDetail
                  account={selected}
                  canOperate={canOperate}
                  canPay={canPay}
                  asking={billMutation.isPending}
                  onAdd={() => {
                    if (selected.occupancy === 'awaiting_bill') {
                      pushToast({
                        title: 'Reabra o atendimento para lançar itens',
                        tone: 'danger',
                      });
                      return;
                    }
                    if (selected.bill.paidCents > 0) {
                      pushToast({
                        title: 'Pagamento já iniciado',
                        description: 'O servidor bloqueia novos pedidos nesta conta.',
                        tone: 'danger',
                      });
                      return;
                    }
                    navigate(selected.occupancy === 'counter' ? '/pdv' : '/pdv');
                  }}
                  onCash={() => navigate(`/caixa?conta=${selected.bill.id}`)}
                  onBill={() => {
                    if (!selected.tableId) return;
                    billMutation.mutate(selected.tableId, {
                      onSuccess: () =>
                        pushToast({
                          title: `Conta de ${billChannelLabel(selected.bill)} pedida`,
                          tone: 'success',
                        }),
                      onError: (err) =>
                        pushToast({
                          title: 'Não foi possível pedir a conta',
                          description: financeErrorMessage(err),
                          tone: 'danger',
                        }),
                    });
                  }}
                />
              </section>
            </aside>
          ) : null}
        </div>
      )}
      <Sheet
        open={detailOpen && Boolean(selected) && !wide}
        onOpenChange={setDetailOpen}
        title={selected ? billChannelLabel(selected.bill) : 'Comanda'}
        description="Conta persistida neste estabelecimento."
      >
        {selected ? (
          <CheckDetail
            account={selected}
            canOperate={canOperate}
            canPay={canPay}
            asking={billMutation.isPending}
            onAdd={() => navigate('/pdv')}
            onCash={() => navigate(`/caixa?conta=${selected.bill.id}`)}
            onBill={() => {
              if (!selected.tableId) return;
              billMutation.mutate(selected.tableId);
            }}
          />
        ) : null}
      </Sheet>
    </div>
  );
}

function CheckDetail({
  account,
  canOperate,
  canPay,
  asking,
  onAdd,
  onCash,
  onBill,
}: {
  account: OpenAccount;
  canOperate: boolean;
  canPay: boolean;
  asking: boolean;
  onAdd: () => void;
  onCash: () => void;
  onBill: () => void;
}) {
  const awaiting = account.occupancy === 'awaiting_bill';
  const counter = account.occupancy === 'counter';
  return (
    <div className="grid gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-muted-foreground">
            {counter ? 'Balcão' : 'Mesa'}
          </p>
          <p className="mt-1 text-4xl leading-none font-extrabold tabular-nums">
            {counter ? `#${account.bill.orders[0]?.number ?? '—'}` : String(account.bill.tableNumber ?? 0).padStart(2, '0')}
          </p>
        </div>
        <StatusBadge
          status={
            account.bill.settled
              ? 'pronto'
              : awaiting
                ? 'awaiting_bill'
                : counter
                  ? 'aberto'
                  : 'occupied'
          }
        />
      </div>
      <BillSummary bill={account.bill} guests={account.guests} />
      <div className="grid gap-2">
        {canPay ? (
          <Button onClick={onCash}>
            {account.bill.settled ? 'Ver no caixa' : 'Receber pagamento'}
          </Button>
        ) : null}
        {canOperate && !counter && !awaiting && account.bill.paidCents === 0 ? (
          <Button variant="secondary" onClick={onBill} loading={asking}>
            Pedir conta
          </Button>
        ) : null}
        {canOperate && !counter && !awaiting && account.bill.paidCents === 0 ? (
          <Button variant="outline" onClick={onAdd}>
            Adicionar itens
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-3 rounded-[16px] border bg-card px-4 py-3 text-left shadow-card transition duration-150 hover:-translate-y-0.5 hover:shadow-pop motion-reduce:transform-none',
        active ? 'border-foreground' : 'border-border/70',
      )}
    >
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-[12px]', tone)}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold text-muted-foreground">{label}</span>
        <span className="mt-0.5 block text-xl leading-none font-extrabold tabular-nums">
          {value}
        </span>
      </span>
    </button>
  );
}
