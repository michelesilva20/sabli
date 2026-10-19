import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ProductCatalogCard, ProductCategoryTabs } from '@/features/catalog/product-card';
import { ApiOrderSummary } from '@/features/pos/api-order-summary';
import { Alert, EmptyState, Skeleton } from '@/design-system/components/feedback';
import { Button } from '@/design-system/components/button';
import { Dialog } from '@/design-system/components/dialog';
import { SearchInput } from '@/design-system/components/input';
import { PageHeader } from '@/design-system/components/navigation';
import { Sheet } from '@/design-system/components/sheet';
import { pushToast } from '@/design-system/components/toast';
import { toCatalogCard, type ProductResponse } from '@/shared/api/catalog';
import { useCatalogCategoriesQuery, useCatalogProductsQuery } from '@/shared/api/catalog-queries';
import { useDiningTablesQuery } from '@/shared/api/dining-queries';
import { ApiError, ApiUnavailableError } from '@/shared/api/http-client';
import { usePlaceOrderMutation } from '@/shared/api/orders-queries';
import { formatBRL } from '@/shared/domain/money';
import { canPlaceOrder, useAuthSession } from '@/shared/auth/session';
import {
  addDraftLine,
  canBindDraftContext,
  clearConfirmedDraft,
  ensureDraftContext,
  ensureIdempotencyKey,
  quotedDraftTotalCents,
  setDraftContext,
  toPlaceItems,
  useOrderDraft,
  type DraftContext,
} from '@/shared/orders/order-draft';
import { cn } from '@/shared/utils/cn';

const ALL_CATEGORIES = 'all';

export function ApiPosPage() {
  const navigate = useNavigate();
  const session = useAuthSession();
  const establishmentId = session.context?.establishment?.id;
  const canSend = canPlaceOrder(session.context);
  const draft = useOrderDraft();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [orderOpen, setOrderOpen] = useState(false);
  const [pendingContext, setPendingContext] = useState<DraftContext | null>(null);
  const [priceGap, setPriceGap] = useState<{ expected: number; actual: number } | null>(null);
  const sendLock = useRef(false);
  const categories = useCatalogCategoriesQuery();
  const products = useCatalogProductsQuery({
    q: search.trim() || undefined,
    categoryId: category === ALL_CATEGORIES ? undefined : category,
    page: 0,
    size: 40,
  });
  const tables = useDiningTablesQuery();
  const placeMutation = usePlaceOrderMutation();

  const visibleDraft =
    draft.context?.establishmentId === establishmentId ? draft : { ...draft, lines: [], context: null };
  const openTables = (tables.data ?? []).filter(
    (table) => table.occupancy === 'OCCUPIED' && table.activeService?.status === 'OPEN',
  );
  const counterContext = useMemo<DraftContext | null>(
    () =>
      establishmentId
        ? {
            establishmentId,
            channel: 'COUNTER',
            tableId: null,
            tableServiceId: null,
            tableNumber: null,
          }
        : null,
    [establishmentId],
  );

  useEffect(() => {
    if (establishmentId && counterContext && !draft.context) {
      ensureDraftContext(counterContext);
    }
  }, [counterContext, draft.context, establishmentId]);

  const activeContext = visibleDraft.context ?? counterContext;
  const tabs = useMemo(
    () => [{ id: ALL_CATEGORIES, name: 'Todas' }, ...(categories.data ?? []).map((item) => ({ id: item.id, name: item.name }))],
    [categories.data],
  );
  const items = products.data?.items ?? [];
  const quotedTotal = quotedDraftTotalCents(visibleDraft.lines);
  const itemCount = visibleDraft.lines.reduce((sum, line) => sum + line.quantity, 0);
  const busy = placeMutation.isPending;
  const error =
    products.error instanceof ApiError && products.error.code === 'TENANT_SUSPENDED'
      ? 'Estabelecimento suspenso. Pedidos estão bloqueados.'
      : products.error instanceof ApiError && products.error.status === 403
        ? 'Acesso negado ao cardápio deste estabelecimento.'
        : products.isError
          ? 'Não foi possível carregar o cardápio.'
          : null;

  function bindContext(next: DraftContext) {
    if (canBindDraftContext(next)) {
      if (!visibleDraft.context) ensureDraftContext(next);
      else setDraftContext(next);
      return;
    }
    setPendingContext(next);
  }

  function addStandard(product: ProductResponse) {
    if (!canSend || !product.available) {
      pushToast({ title: 'Produto indisponível', tone: 'danger' });
      return;
    }
    if (product.kind === 'PIZZA') {
      navigate('/pdv/montar-pizza');
      return;
    }
    const variant = product.variants.find((item) => item.available && item.status === 'ACTIVE') ?? product.variants[0];
    if (!variant) {
      pushToast({ title: 'Produto sem variação ativa', tone: 'danger' });
      return;
    }
    if (establishmentId && counterContext && !visibleDraft.context) ensureDraftContext(counterContext);
    addDraftLine({
      productId: product.id,
      variantId: variant.id,
      kind: 'STANDARD',
      name: product.name,
      quantity: 1,
      quotedUnitCents: variant.priceCents,
    });
    pushToast({ title: `${product.name} no pedido`, tone: 'success' });
  }

  function confirmOrder(expectedTotalCents = quotedTotal) {
    if (!canSend || !establishmentId || !activeContext || sendLock.current || busy) return;
    if (visibleDraft.lines.length === 0) return;
    if (activeContext.establishmentId !== establishmentId) {
      pushToast({ title: 'Rascunho de outro estabelecimento', tone: 'danger' });
      return;
    }
    if (activeContext.channel === 'TABLE' && !activeContext.tableServiceId) {
      pushToast({ title: 'Selecione uma mesa com atendimento aberto', tone: 'danger' });
      return;
    }
    sendLock.current = true;
    const key = ensureIdempotencyKey();
    placeMutation.mutate(
      {
        idempotencyKey: key,
        body: {
          channel: activeContext.channel,
          tableServiceId: activeContext.tableServiceId ?? undefined,
          expectedTotalCents,
          items: toPlaceItems(visibleDraft.lines),
        },
      },
      {
        onSuccess: (order) => {
          setPriceGap(null);
          clearConfirmedDraft();
          setOrderOpen(false);
          pushToast({
            title: `Pedido #${order.number} confirmado`,
            description: `${order.channel === 'TABLE' ? 'Mesa' : 'Balcão'} · ${formatBRL(order.totalCents)}`,
            tone: 'success',
          });
          navigate('/pedidos');
        },
        onError: (cause) => {
          if (cause instanceof ApiError && cause.code === 'PRICE_CHANGED' && cause.actualTotalCents != null) {
            setPriceGap({
              expected: cause.expectedTotalCents ?? expectedTotalCents,
              actual: cause.actualTotalCents,
            });
            return;
          }
          pushToast({ title: placeError(cause), tone: 'danger' });
        },
        onSettled: () => {
          sendLock.current = false;
        },
      },
    );
  }

  const tableLabel = activeContext?.tableNumber
    ? `Mesa ${String(activeContext.tableNumber).padStart(2, '0')}`
    : 'Balcão';

  return (
    <div className="grid gap-5 pb-24 lg:pb-0">
      <PageHeader
        title="Novo pedido"
        description={
          activeContext?.channel === 'TABLE'
            ? `${tableLabel} · atendimento aberto`
            : 'Balcão · selecione uma mesa ocupada se quiser vincular o pedido'
        }
        actions={
          <Button variant="secondary" onClick={() => navigate('/pdv/montar-pizza')}>
            Montar pizza
          </Button>
        }
      />
      {!canSend ? (
        <Alert title="Sem permissão para criar pedidos" tone="warning">
          A cozinha acompanha a produção, mas não registra pedido. O servidor autoriza a criação.
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={cn(
            'rounded-full px-3 py-2 text-sm font-extrabold',
            activeContext?.channel === 'COUNTER' ? 'bg-foreground text-background' : 'border border-border bg-card',
          )}
          onClick={() => counterContext && bindContext(counterContext)}
        >
          Venda de balcão
        </button>
        {openTables.map((table) => {
          const next: DraftContext = {
            establishmentId: table.establishmentId,
            channel: 'TABLE',
            tableId: table.id,
            tableServiceId: table.activeService?.id ?? null,
            tableNumber: table.number,
          };
          const selected = activeContext?.tableServiceId === table.activeService?.id;
          return (
            <button
              key={table.id}
              type="button"
              className={cn(
                'rounded-full px-3 py-2 text-sm font-extrabold',
                selected ? 'bg-foreground text-background' : 'border border-border bg-card',
              )}
              onClick={() => bindContext(next)}
            >
              Mesa {String(table.number).padStart(2, '0')}
            </button>
          );
        })}
      </div>
      {activeContext?.channel === 'TABLE' ? (
        <Alert title={`Pedido vinculado à ${tableLabel}`}>
          Os itens entram neste atendimento. O rascunho some se o navegador for fechado.
        </Alert>
      ) : (
        <Alert title="Venda de balcão">O pedido não fica ligado a uma mesa.</Alert>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
        <div className="grid gap-4">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar no cardápio"
            aria-label="Buscar no cardápio"
          />
          {!search ? <ProductCategoryTabs categories={tabs} value={category} onChange={setCategory} /> : null}
          {error ? (
            <EmptyState title={error} description="Nenhum fixture de demonstração é usado como fallback." />
          ) : products.isLoading || categories.isLoading ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-56" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title={search ? 'Nenhum produto encontrado' : 'Catálogo vazio'}
              description={search ? 'Tente outro nome.' : 'Este estabelecimento ainda não tem produtos ativos.'}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {items.map((product) => {
                const card = toCatalogCard(product);
                return (
                  <ProductCatalogCard
                    key={product.id}
                    product={card}
                    available={card.available}
                    showAdd={canSend}
                    onAdd={() => addStandard(product)}
                  />
                );
              })}
            </div>
          )}
        </div>
        <div className="hidden lg:block">
          <ApiOrderSummary
            lines={visibleDraft.lines}
            confirmLabel="Enviar para cozinha"
            confirming={busy}
            disabled={!canSend || busy}
            onConfirm={() => confirmOrder()}
            hint="Rascunho local até o servidor confirmar. Sem desconto automático."
          />
        </div>
      </div>
      <div className="lg:hidden">
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-pop">
          <div className="mx-auto flex w-full max-w-[1520px] items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-muted-foreground">
                {itemCount} {itemCount === 1 ? 'item' : 'itens'}
              </p>
              <p className="tabular text-lg leading-none font-extrabold">{formatBRL(quotedTotal)}</p>
            </div>
            <Button onClick={() => setOrderOpen(true)}>Ver pedido</Button>
          </div>
        </div>
        <Sheet
          open={orderOpen}
          onOpenChange={setOrderOpen}
          side="bottom"
          title="Pedido"
          description="Rascunho local até o servidor confirmar."
        >
          <ApiOrderSummary
            lines={visibleDraft.lines}
            confirmLabel="Enviar para cozinha"
            confirming={busy}
            disabled={!canSend || busy}
            onConfirm={() => confirmOrder()}
            hint="Rascunho local até o servidor confirmar. Sem desconto automático."
          />
        </Sheet>
      </div>
      <Dialog
        open={Boolean(pendingContext)}
        onOpenChange={(open) => {
          if (!open) setPendingContext(null);
        }}
        title="Trocar o contexto do pedido?"
        description="Há um rascunho neste atendimento. Ele não é salvo no navegador."
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingContext(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!pendingContext) return;
                setDraftContext(pendingContext);
                setPendingContext(null);
              }}
            >
              Descartar rascunho
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Descartar limpa os itens atuais. Cancelar mantém o rascunho neste contexto.
        </p>
      </Dialog>
      <Dialog
        open={Boolean(priceGap)}
        onOpenChange={(open) => {
          if (!open) setPriceGap(null);
        }}
        title="O preço mudou"
        description="A cotação não reserva valor. Confirme o total atual do servidor."
        footer={
          <>
            <Button variant="ghost" onClick={() => setPriceGap(null)}>
              Manter rascunho
            </Button>
            <Button
              loading={busy}
              onClick={() => {
                if (!priceGap) return;
                confirmOrder(priceGap.actual);
              }}
            >
              Confirmar {priceGap ? formatBRL(priceGap.actual) : ''}
            </Button>
          </>
        }
      >
        {priceGap ? (
          <p className="text-sm text-muted-foreground">
            Exibido {formatBRL(priceGap.expected)}. Total atual {formatBRL(priceGap.actual)}. O pedido não foi
            duplicado.
          </p>
        ) : null}
      </Dialog>
    </div>
  );
}

function placeError(error: unknown) {
  if (error instanceof ApiUnavailableError) {
    return 'Não confirmamos se o pedido chegou. Tente de novo; a mesma tentativa não duplica.';
  }
  if (error instanceof ApiError && error.code === 'IDEMPOTENCY_CONFLICT') {
    return 'Esta tentativa conflitou com outro pedido. Revise o rascunho.';
  }
  if (error instanceof ApiError && error.code === 'SERVICE_AWAITING_BILL') {
    return 'Não é possível incluir pedido com a conta solicitada.';
  }
  if (error instanceof ApiError && error.code === 'SERVICE_NOT_OPEN') {
    return 'O atendimento da mesa não está aberto.';
  }
  if (error instanceof ApiError && error.code === 'TENANT_SUSPENDED') {
    return 'Estabelecimento suspenso.';
  }
  if (error instanceof ApiError && error.status === 403) {
    return 'Você não pode criar pedidos neste estabelecimento.';
  }
  if (error instanceof ApiError) return error.message;
  return 'Não foi possível confirmar o pedido.';
}
