import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ApiTableEditor } from '@/features/dining/api-table-editor';
import { DiningSalon, DiningStatusFilters } from '@/features/dining/dining-map';
import { occupancyEdge } from '@/features/dining/dining-occupancy';
import { Alert, EmptyState, Skeleton } from '@/design-system/components/feedback';
import { Button } from '@/design-system/components/button';
import { Checkbox } from '@/design-system/components/choice';
import { Dialog } from '@/design-system/components/dialog';
import { NumberInput } from '@/design-system/components/number-input';
import { PageHeader, SegmentedControl } from '@/design-system/components/navigation';
import { Sheet } from '@/design-system/components/sheet';
import { StatusBadge } from '@/design-system/components/badge';
import { pushToast } from '@/design-system/components/toast';
import { useBillByServiceQuery } from '@/shared/api/billing-queries';
import { BILL_STATUS_LABEL } from '@/shared/api/billing';
import { financeErrorMessage } from '@/shared/api/finance-errors';
import {
  invalidateDining,
  useCloseServiceMutation,
  useDiningHistoryQuery,
  useDiningTablesQuery,
  useOpenServiceMutation,
  useReopenServiceMutation,
  useRequestBillMutation,
} from '@/shared/api/dining-queries';
import { toDiningMapTable, type TableResponse } from '@/shared/api/dining';
import { ApiError } from '@/shared/api/http-client';
import {
  canCloseSettledTable,
  canManageDining,
  canOperateDining,
  canReadBill,
  useAuthSession,
} from '@/shared/auth/session';
import { formatBRL } from '@/shared/domain/money';
import {
  canBindDraftContext,
  setDraftContext,
  type DraftContext,
} from '@/shared/orders/order-draft';
import { elapsedLabel, formatDateTime } from '@/shared/domain/date';
import type { TableStatus } from '@/shared/types/domain';
import { cn } from '@/shared/utils/cn';

export function ApiDiningPage() {
  const session = useAuthSession();
  const establishmentId = session.context?.establishment?.id;
  const canManage = canManageDining(session.context);
  const canOperate = canOperateDining(session.context);
  const canReadFinance = canReadBill(session.context);
  const canClose = canCloseSettledTable(session.context);
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [filter, setFilter] = useState<'all' | TableStatus>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [guests, setGuests] = useState(2);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<TableResponse | null>(null);
  const [confirm, setConfirm] = useState<'reserve' | 'bill' | 'reopen' | 'pos' | 'close' | null>(
    null,
  );
  const navigate = useNavigate();
  const openingLock = useRef(false);

  const tablesQuery = useDiningTablesQuery(canManage && includeInactive);
  const historyQuery = useDiningHistoryQuery(selectedId);
  const openMutation = useOpenServiceMutation();
  const billMutation = useRequestBillMutation();
  const reopenMutation = useReopenServiceMutation();
  const closeMutation = useCloseServiceMutation();

  const tables = tablesQuery.data;
  const mapTables = useMemo(() => (tables ?? []).map(toDiningMapTable), [tables]);
  const selected = tables?.find((table) => table.id === selectedId) ?? null;
  const selectedMap = mapTables.find((table) => table.id === selectedId) ?? null;
  const selectedService = selected?.activeService ?? null;
  const selectedBillQuery = useBillByServiceQuery(
    selectedService?.id ?? null,
    Boolean(canReadFinance && selectedService),
  );
  const selectedBill = selectedBillQuery.data;
  const busy =
    openMutation.isPending ||
    billMutation.isPending ||
    reopenMutation.isPending ||
    closeMutation.isPending;
  const counts = useMemo(() => {
    const next = {
      available: 0,
      occupied: 0,
      awaiting_bill: 0,
      reserved: 0,
      unavailable: 0,
    } satisfies Record<TableStatus, number>;
    for (const table of mapTables) next[table.status] += 1;
    return next;
  }, [mapTables]);
  const serving = counts.occupied + counts.awaiting_bill;
  const visible = mapTables.filter((table) => filter === 'all' || table.status === filter);
  const errorMessage = errorCopy(tablesQuery.error);
  const forbidden = errorMessage?.code === 'FORBIDDEN';
  const suspended = errorMessage?.code === 'TENANT_SUSPENDED';

  function selectTable(id: string) {
    const table = tables?.find((item) => item.id === id);
    setSelectedId(id);
    setConfirm(null);
    setGuests(Math.min(Math.max(table?.activeService?.guests ?? 2, 1), table?.seats ?? 2));
  }

  function tableDraftContext(): DraftContext | null {
    if (!establishmentId || !selected || !selectedService) return null;
    return {
      establishmentId,
      channel: 'TABLE',
      tableId: selected.id,
      tableServiceId: selectedService.id,
      tableNumber: selected.number,
    };
  }

  function goToPos() {
    const next = tableDraftContext();
    if (!next) return;
    if (!canBindDraftContext(next)) {
      setConfirm('pos');
      return;
    }
    openPos();
  }

  function openPos() {
    const next = tableDraftContext();
    if (!next) return;
    setDraftContext(next);
    setConfirm(null);
    setSelectedId(null);
    navigate('/pdv');
  }

  async function refreshAfterConflict() {
    if (!establishmentId) return;
    await invalidateDining(establishmentId);
    await tablesQuery.refetch();
  }

  function handleMutationError(error: unknown) {
    void refreshAfterConflict();
    pushToast({ title: mutationError(error), tone: 'danger' });
  }

  function openSelected() {
    if (!selected || openingLock.current || busy) return;
    if (selected.occupancy === 'RESERVED') {
      setConfirm('reserve');
      return;
    }
    submitOpen();
  }

  function submitOpen() {
    if (!selected || openingLock.current || busy) return;
    openingLock.current = true;
    openMutation.mutate(
      { tableId: selected.id, guests },
      {
        onSuccess: (service) => {
          setConfirm(null);
          pushToast({
            title: `Atendimento aberto na mesa ${String(selected.number).padStart(2, '0')}`,
            description: `Responsável: ${service.hostName}`,
            tone: 'success',
          });
        },
        onError: handleMutationError,
        onSettled: () => {
          openingLock.current = false;
        },
      },
    );
  }

  function submitBill() {
    if (!selected || busy) return;
    billMutation.mutate(selected.id, {
      onSuccess: () => {
        setConfirm(null);
        pushToast({
          title: `Conta da mesa ${String(selected.number).padStart(2, '0')} pedida`,
          tone: 'success',
        });
      },
      onError: handleMutationError,
    });
  }

  function submitReopen() {
    if (!selected || busy) return;
    reopenMutation.mutate(selected.id, {
      onSuccess: () => {
        setConfirm(null);
        pushToast({ title: 'Atendimento reaberto', tone: 'success' });
      },
      onError: handleMutationError,
    });
  }

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Mapa de mesas"
        description="Ocupação e atendimentos deste estabelecimento vêm do servidor."
        actions={
          <>
            <SegmentedControl
              label="Visualização"
              value={mode}
              onChange={setMode}
              options={[
                { id: 'map', label: 'Mapa' },
                { id: 'list', label: 'Lista' },
              ]}
            />
            {canManage ? (
              <Button
                onClick={() => {
                  setEditing(null);
                  setEditorOpen(true);
                }}
              >
                Nova mesa
              </Button>
            ) : null}
          </>
        }
      />
      {forbidden || suspended ? (
        <EmptyState
          title={suspended ? 'Estabelecimento suspenso' : 'Acesso negado'}
          description={
            suspended
              ? 'Este estabelecimento não opera mesas enquanto estiver suspenso.'
              : 'Sua membership neste estabelecimento não permite ver o mapa de mesas.'
          }
        />
      ) : (
        <>
          {canManage ? (
            <Checkbox
              label="Incluir desativadas"
              checked={includeInactive}
              onCheckedChange={setIncludeInactive}
            />
          ) : null}
          <DiningStatusFilters filter={filter} counts={counts} onChange={setFilter} />
          {errorMessage && !forbidden && !suspended ? (
            <div role="alert">
              <EmptyState
                title={errorMessage.title}
                description={errorMessage.description}
                action={
                  <Button variant="outline" onClick={() => void tablesQuery.refetch()}>
                    Tentar novamente
                  </Button>
                }
              />
            </div>
          ) : tablesQuery.isLoading ? (
            <Skeleton className="h-[640px]" />
          ) : (tables?.length ?? 0) === 0 ? (
            <EmptyState
              title="Nenhuma mesa cadastrada"
              description="Este estabelecimento ainda não tem mesas ativas no mapa."
              action={
                canManage ? (
                  <Button
                    onClick={() => {
                      setEditing(null);
                      setEditorOpen(true);
                    }}
                  >
                    Cadastrar mesa
                  </Button>
                ) : null
              }
            />
          ) : mode === 'map' ? (
            <DiningSalon
              title={selected?.area || tables?.[0]?.area || 'Salão'}
              subtitle={
                <>
                  {serving} em atendimento
                  {selectedBill ? (
                    <>
                      <span className="px-2">·</span>
                      {BILL_STATUS_LABEL[selectedBill.status]} {formatBRL(selectedBill.remainingCents)}
                    </>
                  ) : null}
                </>
              }
              tables={mapTables}
              selectedId={selectedId}
              filter={filter}
              onSelect={selectTable}
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((table) => (
                <li key={table.id}>
                  <button
                    type="button"
                    onClick={() => selectTable(table.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-[16px] border border-border bg-card p-3 text-left shadow-card transition-shadow duration-200 hover:shadow-pop',
                      table.id === selectedId && 'ring-2 ring-primary',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-12 shrink-0 place-items-center rounded-[14px] border-2 bg-card text-sm font-extrabold tabular-nums',
                        occupancyEdge[table.status],
                      )}
                    >
                      {String(table.number).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-extrabold">
                        Mesa {String(table.number).padStart(2, '0')}
                      </span>
                      <span className="text-xs font-bold text-muted-foreground">
                        {table.guests > 0 ? `${table.guests} pessoas` : `${table.seats} lugares`}
                        {table.openedAt ? ` · ${elapsedLabel(table.openedAt)}` : ''}
                      </span>
                    </span>
                    <StatusBadge status={table.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
            setConfirm(null);
          }
        }}
        title={selected ? `Mesa ${String(selected.number).padStart(2, '0')}` : 'Mesa'}
        description="Detalhes do atendimento persistido neste estabelecimento."
      >
        {selected && selectedMap ? (
          <div className="grid gap-4">
            <StatusBadge status={selectedMap.status} />
            {selectedMap.status === 'unavailable' ? (
              <Alert title="Mesa indisponível" tone="warning">
                Mesa inativa ou bloqueada não recebe atendimento.
              </Alert>
            ) : null}
            {selectedMap.status === 'reserved' ? (
              <Alert title="Mesa reservada">
                Abrir o atendimento consome a reserva de forma explícita.
              </Alert>
            ) : null}
            {selectedMap.status === 'occupied' ? (
              <Alert title="Mesa ocupada">Há um atendimento aberto nesta mesa.</Alert>
            ) : null}
            {selectedMap.status === 'awaiting_bill' ? (
              <Alert title="Aguardando conta" tone="warning">
                A conta foi pedida. A mesa continua ocupada até a quitação confirmada pelo servidor.
              </Alert>
            ) : null}
            {selectedBill ? (
              <Alert
                title={`${BILL_STATUS_LABEL[selectedBill.status]} · ${formatBRL(selectedBill.remainingCents)}`}
                tone={selectedBill.settled ? 'success' : 'info'}
              >
                Totais do servidor. Desconto persistido {formatBRL(selectedBill.discountCents)}.
              </Alert>
            ) : selectedService && canReadFinance && selectedBillQuery.isLoading ? (
              <Skeleton className="h-16" />
            ) : selectedService && canReadFinance && selectedBillQuery.error ? (
              <Alert title="Não foi possível carregar a comanda" tone="danger">
                {financeErrorMessage(selectedBillQuery.error)}
              </Alert>
            ) : null}
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <dt>Área</dt>
                <dd className="font-bold">{selected.area ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Lugares</dt>
                <dd className="font-bold">{selected.seats}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Pessoas</dt>
                <dd className="font-bold">{selectedService?.guests ?? 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Tempo</dt>
                <dd>{selectedService ? elapsedLabel(selectedService.openedAt) : '—'}</dd>
              </div>
              {selectedService ? (
                <>
                  <div className="flex justify-between">
                    <dt>Abertura</dt>
                    <dd>{formatDateTime(selectedService.openedAt)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Responsável</dt>
                    <dd className="font-bold">{selectedService.hostName}</dd>
                  </div>
                </>
              ) : null}
              {selectedService?.requestedBillAt ? (
                <div className="flex justify-between">
                  <dt>Conta pedida</dt>
                  <dd>{formatDateTime(selectedService.requestedBillAt)}</dd>
                </div>
              ) : null}
            </dl>
            {(selectedMap.status === 'available' || selectedMap.status === 'reserved') && canOperate ? (
              <label className="grid gap-1 text-sm font-bold">
                Pessoas neste atendimento
                <NumberInput
                  value={guests}
                  min={1}
                  max={selected.seats}
                  onChange={(event) => setGuests(Number(event.target.value))}
                />
              </label>
            ) : null}
            <div className="grid gap-2">
              {(selectedMap.status === 'available' || selectedMap.status === 'reserved') && canOperate ? (
                <Button onClick={openSelected} loading={openMutation.isPending} disabled={busy}>
                  Abrir atendimento
                </Button>
              ) : null}
              {selectedMap.status === 'occupied' && canOperate ? (
                <>
                  <Button onClick={goToPos}>Adicionar itens</Button>
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setConfirm('bill')}
                  >
                    Pedir conta
                  </Button>
                </>
              ) : null}
              {selectedMap.status === 'awaiting_bill' && canOperate ? (
                <Button disabled={busy} onClick={() => setConfirm('reopen')}>
                  Reabrir atendimento
                </Button>
              ) : null}
              {selectedBill?.settled && canClose && selectedMap.status !== 'available' ? (
                <Button disabled={busy} onClick={() => setConfirm('close')}>
                  Encerrar atendimento
                </Button>
              ) : null}
              {canManage ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(selected);
                    setSelectedId(null);
                    setEditorOpen(true);
                  }}
                >
                  Editar mesa
                </Button>
              ) : null}
            </div>
            {historyQuery.data && historyQuery.data.items.length > 0 ? (
              <div className="grid gap-2">
                <p className="text-sm font-extrabold">Histórico</p>
                <ul className="grid gap-2">
                  {historyQuery.data.items.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-[12px] border border-border bg-muted/40 px-3 py-2 text-sm"
                    >
                      <p className="font-bold">
                        {item.status === 'OPEN'
                          ? 'Aberto'
                          : item.status === 'AWAITING_BILL'
                            ? 'Aguardando conta'
                            : 'Encerrado'}
                        {' · '}
                        {item.guests} pessoas
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.hostName} · {formatDateTime(item.openedAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </Sheet>
      <Dialog
        open={confirm === 'reserve'}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title="Abrir mesa reservada"
        description="A reserva será consumida e a mesa passará a ocupada."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancelar
            </Button>
            <Button onClick={submitOpen} loading={openMutation.isPending}>
              Confirmar abertura
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Só confirme se o grupo da reserva chegou. O servidor registra o responsável autenticado.
        </p>
      </Dialog>
      <Dialog
        open={confirm === 'bill'}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title="Pedir conta"
        description="A mesa fica aguardando pagamento. Ela não será liberada nem marcada como paga."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancelar
            </Button>
            <Button onClick={submitBill} loading={billMutation.isPending}>
              Confirmar pedido de conta
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          A mesa fica aguardando pagamento. Quitação e encerramento só acontecem depois da
          confirmação do servidor.
        </p>
      </Dialog>
      <Dialog
        open={confirm === 'pos'}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title="Trocar o contexto do pedido?"
        description="Há um rascunho em outro atendimento. Ele não é salvo no navegador."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancelar
            </Button>
            <Button onClick={openPos}>Descartar rascunho</Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Descartar limpa os itens atuais e leva ao PDV desta mesa.
        </p>
      </Dialog>
      <Dialog
        open={confirm === 'close'}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title="Encerrar atendimento"
        description="O servidor só libera a mesa se a conta estiver quitada."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!selected || busy) return;
                closeMutation.mutate(selected.id, {
                  onSuccess: () => {
                    setConfirm(null);
                    setSelectedId(null);
                    pushToast({
                      title: `Mesa ${String(selected.number).padStart(2, '0')} liberada`,
                      tone: 'success',
                    });
                  },
                  onError: handleMutationError,
                });
              }}
              loading={closeMutation.isPending}
            >
              Confirmar encerramento
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          {selectedBill?.settled
            ? 'A conta está SETTLED. Encerrar devolve a mesa para disponível.'
            : 'Se o saldo não estiver quitado, o backend recusa e a mesa permanece ocupada.'}
        </p>
      </Dialog>
      <Dialog
        open={confirm === 'reopen'}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title="Reabrir atendimento"
        description="O servidor decide se a reabertura é permitida."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancelar
            </Button>
            <Button onClick={submitReopen} loading={reopenMutation.isPending}>
              Confirmar reabertura
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Se já houver pagamento, o backend bloqueia. A interface não altera o estado por conta própria.
        </p>
      </Dialog>
      {canManage ? (
        <ApiTableEditor open={editorOpen} onOpenChange={setEditorOpen} table={editing} />
      ) : null}
      {busy ? <Alert title="Salvando">A alteração está sendo confirmada no servidor.</Alert> : null}
    </div>
  );
}

function errorCopy(error: unknown) {
  if (!error) return null;
  if (error instanceof ApiError && error.code === 'TENANT_SUSPENDED') {
    return {
      code: 'TENANT_SUSPENDED',
      title: 'Estabelecimento suspenso',
      description: 'Operações de mesas estão bloqueadas neste tenant.',
    };
  }
  if (error instanceof ApiError && error.status === 403) {
    return { code: 'FORBIDDEN', title: 'Acesso negado', description: 'Você não pode ver este mapa.' };
  }
  if (error instanceof ApiError && error.status === 404) {
    return {
      code: 'NOT_FOUND',
      title: 'Mesas não encontradas',
      description: 'O estabelecimento autorizado não devolveu este recurso.',
    };
  }
  if (error instanceof ApiError && error.status === 401) {
    return { code: 'UNAUTHENTICATED', title: 'Sessão expirada', description: 'Entre de novo para continuar.' };
  }
  return {
    code: 'NETWORK',
    title: 'Não foi possível carregar as mesas',
    description: 'A consulta falhou. Tente de novo sem recarregar o restante da sessão.',
  };
}

function mutationError(error: unknown) {
  if (!(error instanceof ApiError)) return 'Não foi possível concluir a operação.';
  if (error.code === 'TABLE_OCCUPIED') return 'A mesa já possui um atendimento ativo.';
  if (error.code === 'STALE_VERSION') {
    return 'Os dados da mesa mudaram. Atualizamos o mapa antes de uma nova tentativa.';
  }
  if (error.code === 'TENANT_SUSPENDED') return 'O estabelecimento está suspenso.';
  if (error.code === 'TABLE_INACTIVE') return 'Mesa inativa não recebe atendimento.';
  if (error.code === 'TABLE_UNAVAILABLE') return 'Mesa indisponível não recebe atendimento.';
  if (error.code === 'GUESTS_EXCEED_CAPACITY') return 'A quantidade de pessoas excede a capacidade da mesa.';
  if (error.code === 'SERVICE_NOT_OPEN') return 'Só é possível pedir conta em atendimento aberto.';
  if (error.code === 'SERVICE_NOT_AWAITING_BILL') {
    return 'Só é possível reabrir um atendimento que aguarda a conta.';
  }
  if (error.code === 'CLOSE_REQUIRES_SETTLEMENT') {
    return 'Quite o saldo restante antes de liberar a mesa.';
  }
  if (error.status === 403) return 'Você não pode operar o salão neste estabelecimento.';
  return error.message || 'Não foi possível concluir a operação.';
}
