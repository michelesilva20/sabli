import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Banner, EmptyState, Skeleton } from '@/design-system/components/feedback';
import { Button } from '@/design-system/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/components/card';
import { ConfirmationDialog } from '@/design-system/components/alert-dialog';
import { fieldDescribedBy, FormField } from '@/design-system/components/form-field';
import { Input } from '@/design-system/components/input';
import { CurrencyInput } from '@/design-system/components/number-input';
import { PageHeader } from '@/design-system/components/navigation';
import { pushToast } from '@/design-system/components/toast';
import { ApiBillPanel } from '@/features/cash/api-bill-panel';
import { billChannelLabel } from '@/shared/api/billing';
import { financeErrorMessage, useOpenAccountsQuery } from '@/shared/api/billing-queries';
import {
  CASH_MOVEMENT_LABEL,
  methodTotalCents,
  salesTotalCents,
} from '@/shared/api/cash';
import {
  useCashMovementMutation,
  useCloseCashMutation,
  useCurrentCashQuery,
  useOpenCashMutation,
} from '@/shared/api/cash-queries';
import { toUiPaymentMethod } from '@/shared/api/billing';
import { ApiError } from '@/shared/api/http-client';
import { canFinance, canReadBill, useAuthSession } from '@/shared/auth/session';
import { PAYMENT_METHOD_LABEL } from '@/shared/domain/bill';
import { formatDateTime } from '@/shared/domain/date';
import { formatBRL } from '@/shared/domain/money';

const openSchema = z.object({
  openingFloatCents: z.number().int().nonnegative('O fundo de troco não pode ser negativo.'),
  notes: z.string().max(140, 'Use até 140 caracteres.'),
});

type OpenValues = z.infer<typeof openSchema>;

export function ApiCashPage() {
  const session = useAuthSession();
  const establishmentId = session.context?.establishment?.id;
  const finance = canFinance(session.context);
  const canRead = canReadBill(session.context);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedBillId = searchParams.get('conta');
  const cashQuery = useCurrentCashQuery(finance);
  const accountsQuery = useOpenAccountsQuery();
  const openMutation = useOpenCashMutation();
  const moveMutation = useCashMovementMutation();
  const closeMutation = useCloseCashMutation();
  const [closeOpen, setCloseOpen] = useState(false);
  const [movementNotes, setMovementNotes] = useState('Sangria');
  const [movementAmount, setMovementAmount] = useState(0);
  const form = useForm<OpenValues>({
    resolver: zodResolver(openSchema),
    defaultValues: { openingFloatCents: 20000, notes: '' },
  });

  const cash = cashQuery.data ?? null;
  const payable = useMemo(
    () =>
      accountsQuery.accounts.filter(
        (item) => item.bill.remainingCents > 0 || item.bill.settled,
      ),
    [accountsQuery.accounts],
  );
  const settlementId =
    selectedBillId && payable.some((item) => item.bill.id === selectedBillId)
      ? selectedBillId
      : (payable.find((item) => item.bill.remainingCents > 0)?.bill.id ??
        payable[0]?.bill.id ??
        null);
  const settlement = payable.find((item) => item.bill.id === settlementId) ?? null;
  const forbidden = cashQuery.error instanceof ApiError && cashQuery.error.status === 403;

  if (!finance) {
    return (
      <div className="grid gap-4">
        <PageHeader title="Caixa" description="Turno persistido neste estabelecimento." />
        {canRead ? (
          <Banner>Consulta de comanda liberada. Abertura, sangria e pagamentos ficam com o caixa.</Banner>
        ) : (
          <EmptyState
            title="Acesso negado"
            description="A cozinha não opera o caixa nem consulta valores financeiros detalhados."
          />
        )}
      </div>
    );
  }

  if (cashQuery.isLoading) {
    return (
      <div className="grid gap-4">
        <PageHeader title="Caixa" description="Consultando o turno no servidor." />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <EmptyState
        title="Acesso negado"
        description="Este papel não opera o caixa neste estabelecimento."
      />
    );
  }

  if (cashQuery.error) {
    return (
      <div className="grid gap-4">
        <PageHeader title="Caixa" description="Turno persistido neste estabelecimento." />
        <Alert title="Não foi possível consultar o caixa" tone="danger">
          {financeErrorMessage(cashQuery.error)}
        </Alert>
      </div>
    );
  }

  if (!cash) {
    return (
      <div className="mx-auto grid max-w-xl gap-5">
        <PageHeader
          title="Abrir caixa"
          description="O turno fica neste estabelecimento. PIX e cartão continuam declaração manual."
        />
        {settlement && settlement.bill.remainingCents > 0 ? (
          <Banner>
            {billChannelLabel(settlement.bill)} aguarda {formatBRL(settlement.bill.remainingCents)}.
            Abra o turno para registrar o pagamento.
          </Banner>
        ) : (
          <Banner>
            Não informe dados de cartão. O Sabli não pede nem armazena PAN, CVV ou chave PIX do
            cliente.
          </Banner>
        )}
        <Card>
          <CardContent>
            <form
              className="grid gap-4"
              onSubmit={form.handleSubmit((values) => {
                if (!establishmentId) return;
                openMutation.mutate(
                  {
                    establishmentId,
                    openingFloatCents: values.openingFloatCents,
                    notes: values.notes || undefined,
                  },
                  {
                    onSuccess: (opened) =>
                      pushToast({
                        title: 'Caixa aberto',
                        description: `Operador ${opened.openedByName}`,
                        tone: 'success',
                      }),
                    onError: (error) =>
                      pushToast({
                        title: 'Não foi possível abrir o caixa',
                        description: financeErrorMessage(error),
                        tone: 'danger',
                      }),
                  },
                );
              })}
            >
              <FormField
                id="float"
                label="Fundo de troco"
                required
                error={form.formState.errors.openingFloatCents?.message}
              >
                <Controller
                  control={form.control}
                  name="openingFloatCents"
                  render={({ field }) => (
                    <CurrencyInput
                      id="float"
                      valueCents={field.value}
                      onValueChange={field.onChange}
                      invalid={Boolean(form.formState.errors.openingFloatCents)}
                      describedBy={fieldDescribedBy(
                        'float',
                        undefined,
                        form.formState.errors.openingFloatCents?.message,
                      )}
                    />
                  )}
                />
              </FormField>
              <FormField id="note" label="Observação" error={form.formState.errors.notes?.message}>
                <Input id="note" {...form.register('notes')} />
              </FormField>
              <Button type="submit" loading={openMutation.isPending}>
                Abrir turno
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const openSession = cash;
  const salesTotal = salesTotalCents(openSession);

  function registerMovement(type: 'SUPPLY' | 'BLEED') {
    if (!establishmentId) return;
    moveMutation.mutate(
      {
        establishmentId,
        sessionId: openSession.id,
        type,
        amountCents: movementAmount,
        notes: movementNotes || undefined,
      },
      {
        onSuccess: () => {
          setMovementAmount(0);
          pushToast({
            title: type === 'SUPPLY' ? 'Suprimento registrado' : 'Sangria registrada',
            tone: 'success',
          });
        },
        onError: (error) =>
          pushToast({
            title: 'Movimento recusado',
            description: financeErrorMessage(error),
            tone: 'danger',
          }),
      },
    );
  }

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Caixa do turno"
        description={`Aberto em ${formatDateTime(openSession.openedAt)} por ${openSession.openedByName}.`}
        actions={
          <Button variant="destructive" onClick={() => setCloseOpen(true)}>
            Fechar caixa
          </Button>
        }
      />
      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Gaveta em espécie</p>
            <p className="tabular text-2xl font-extrabold">{formatBRL(openSession.drawerCashCents)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Vendas lançadas</p>
            <p className="tabular text-2xl font-extrabold">{formatBRL(salesTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Fundo de troco</p>
            <p className="tabular text-2xl font-extrabold">{formatBRL(openSession.openingFloatCents)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Lançamentos</p>
            <p className="tabular text-2xl font-extrabold">{openSession.movements.length}</p>
          </CardContent>
        </Card>
      </section>
      <section className="grid gap-2 sm:grid-cols-4">
        {(['CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD'] as const).map((item) => (
          <div key={item} className="rounded-[16px] border border-border/70 bg-card px-4 py-3">
            <p className="text-xs font-bold text-muted-foreground">
              {PAYMENT_METHOD_LABEL[toUiPaymentMethod(item)]}
            </p>
            <p className="tabular mt-1 text-lg font-extrabold">
              {formatBRL(methodTotalCents(openSession, item))}
            </p>
          </div>
        ))}
      </section>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]">
        <Card>
          <CardHeader>
            <CardTitle>Fechamento de contas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {payable.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {payable.map((account) => (
                  <Button
                    key={account.bill.id}
                    size="sm"
                    variant={account.bill.id === settlementId ? 'primary' : 'outline'}
                    onClick={() => setSearchParams({ conta: account.bill.id })}
                  >
                    {billChannelLabel(account.bill)}
                  </Button>
                ))}
              </div>
            ) : null}
            {settlementId ? (
              <ApiBillPanel
                billId={settlementId}
                guests={settlement?.guests ?? 2}
                onClosed={() => setSearchParams({})}
              />
            ) : (
              <Banner>
                Nenhuma conta pendente neste estabelecimento. Movimentos de gaveta não quitam
                atendimento.
              </Banner>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Gaveta</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Banner>
              Suprimento entra na gaveta. Sangria não pode superar o saldo em espécie. PIX e cartão
              não alteram a gaveta.
            </Banner>
            <Input
              value={movementNotes}
              onChange={(event) => setMovementNotes(event.target.value)}
              aria-label="Motivo da movimentação"
            />
            <CurrencyInput valueCents={movementAmount} onValueChange={setMovementAmount} />
            <Button
              variant="outline"
              disabled={movementAmount <= 0 || moveMutation.isPending}
              onClick={() => registerMovement('BLEED')}
            >
              Registrar sangria
            </Button>
            <Button
              variant="outline"
              disabled={movementAmount <= 0 || moveMutation.isPending}
              onClick={() => registerMovement('SUPPLY')}
            >
              Registrar suprimento
            </Button>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Movimentações</CardTitle>
        </CardHeader>
        <CardContent>
          {openSession.movements.length === 0 ? (
            <p className="text-sm font-semibold text-muted-foreground">Sem movimentações neste turno.</p>
          ) : (
            <ul className="divide-y divide-border">
              {openSession.movements.map((movement) => (
                <li key={movement.id} className="flex items-center justify-between py-3 text-sm">
                  <span>
                    <span className="block font-extrabold">
                      {CASH_MOVEMENT_LABEL[movement.type]}
                      {movement.method
                        ? ` · ${PAYMENT_METHOD_LABEL[toUiPaymentMethod(movement.method)]}`
                        : ''}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {movement.recordedByName} · {formatDateTime(movement.recordedAt)}
                      {movement.notes ? ` · ${movement.notes}` : ''}
                    </span>
                  </span>
                  <span className="tabular font-extrabold">{formatBRL(movement.amountCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <ConfirmationDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        title="Fechar o caixa?"
        description="O servidor encerra o turno. Pagamentos já gravados e mesas quitadas permanecem."
        confirmLabel="Fechar caixa"
        tone="destructive"
        onConfirm={() => {
          if (!establishmentId) return;
          closeMutation.mutate(
            { establishmentId, sessionId: openSession.id, version: openSession.version },
            {
              onSuccess: () => pushToast({ title: 'Caixa encerrado', tone: 'success' }),
              onError: (error) =>
                pushToast({
                  title: 'Não foi possível fechar',
                  description: financeErrorMessage(error),
                  tone: 'danger',
                }),
            },
          );
        }}
      />
    </div>
  );
}
