import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Banner } from '@/design-system/components/feedback';
import { Button } from '@/design-system/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/components/card';
import { ConfirmationDialog } from '@/design-system/components/alert-dialog';
import { fieldDescribedBy, FormField } from '@/design-system/components/form-field';
import { Input } from '@/design-system/components/input';
import { CurrencyInput } from '@/design-system/components/number-input';
import { PageHeader } from '@/design-system/components/navigation';
import { pushToast } from '@/design-system/components/toast';
import { ApiCashPage } from '@/features/cash/api-cash-page';
import { BillSettlement } from '@/features/cash/bill-settlement';
import { isApiMode } from '@/shared/config/runtime';
import { drawerCashCents, PAYMENT_METHOD_LABEL, salesByMethod } from '@/shared/domain/bill';
import { formatDateTime } from '@/shared/domain/date';
import { formatBRL, sumCents } from '@/shared/domain/money';
import { demoSession, useDemoSession } from '@/shared/demo/session';
import type { PaymentMethod } from '@/shared/types/domain';
import { cn } from '@/shared/utils/cn';

const openSchema = z.object({
  operator: z.string().trim().min(2, 'Informe quem está no caixa.'),
  openingFloatCents: z.number().int().nonnegative('O fundo de troco não pode ser negativo.'),
  note: z.string().max(140, 'Use até 140 caracteres.'),
});

type OpenValues = z.infer<typeof openSchema>;

const methods: { id: PaymentMethod; label: string }[] = [
  { id: 'pix', label: 'Pix' },
  { id: 'credit', label: 'Crédito' },
  { id: 'debit', label: 'Débito' },
  { id: 'cash', label: 'Dinheiro' },
];

export function CashPage() {
  if (isApiMode()) return <ApiCashPage />;
  return <DemoCashPage />;
}

function DemoCashPage() {
  const session = useDemoSession();
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [amount, setAmount] = useState(0);
  const [closeOpen, setCloseOpen] = useState(false);
  const [movementLabel, setMovementLabel] = useState('Sangria');
  const [movementAmount, setMovementAmount] = useState(0);
  const form = useForm<OpenValues>({
    resolver: zodResolver(openSchema),
    defaultValues: { operator: 'Carlos Mendes', openingFloatCents: 20000, note: '' },
  });

  const cash = session.cash;
  const awaitingTables = session.tables.filter((table) => table.status === 'awaiting_bill');
  const activeTable = session.tables.find((table) => table.id === session.activeTableId);
  const settlementId =
    activeTable?.status === 'awaiting_bill' ? activeTable.id : (awaitingTables[0]?.id ?? null);
  const awaitingTable = session.tables.find((table) => table.id === settlementId) ?? null;
  const sales = cash?.movements.filter((item) => item.type === 'sale') ?? [];
  const salesTotal = sumCents(sales.map((item) => item.amountCents));
  const drawer = cash ? drawerCashCents(cash.movements) : 0;
  const byMethod = cash ? salesByMethod(cash.movements) : null;

  if (!cash) {
    return (
      <div className="mx-auto grid max-w-xl gap-5">
        <PageHeader
          title="Abrir caixa"
          description="O turno fica apenas neste navegador. Nenhum valor é enviado para um adquirente."
        />
        {awaitingTable ? (
          <Banner>
            Mesa {String(awaitingTable.number).padStart(2, '0')} aguarda pagamento demonstrativo de{' '}
            {formatBRL(awaitingTable.billCents)}. Abra o turno para registrar a quitação. Caixa
            aberto não quita a mesa sozinho.
          </Banner>
        ) : (
          <Banner>
            Demonstração local. Não informe dados de cartão — o Sabli não pede nem armazena esse
            tipo de informação.
          </Banner>
        )}
        <Card>
          <CardContent>
            <form
              className="grid gap-4"
              onSubmit={form.handleSubmit((values) => {
                demoSession.openCash(values);
                pushToast({ title: 'Caixa aberto nesta demonstração', tone: 'success' });
              })}
            >
              <FormField
                id="operator"
                label="Operador"
                required
                error={form.formState.errors.operator?.message}
              >
                <Input
                  id="operator"
                  aria-invalid={Boolean(form.formState.errors.operator)}
                  aria-describedby={fieldDescribedBy(
                    'operator',
                    undefined,
                    form.formState.errors.operator?.message,
                  )}
                  {...form.register('operator')}
                />
              </FormField>
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
              <FormField id="note" label="Observação" error={form.formState.errors.note?.message}>
                <Input id="note" {...form.register('note')} />
              </FormField>
              <Button type="submit">Abrir turno</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Caixa do turno"
        description={`Aberto em ${formatDateTime(cash.openedAt)} por ${cash.operator}. Movimento demonstrativo.`}
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
            <p className="tabular text-2xl font-extrabold">{formatBRL(drawer)}</p>
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
            <p className="tabular text-2xl font-extrabold">{formatBRL(cash.openingFloatCents)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Lançamentos</p>
            <p className="tabular text-2xl font-extrabold">{cash.movements.length}</p>
          </CardContent>
        </Card>
      </section>
      {byMethod ? (
        <section className="grid gap-2 sm:grid-cols-4">
          {(['cash', 'pix', 'debit', 'credit'] as const).map((item) => (
            <div key={item} className="rounded-[16px] border border-border/70 bg-card px-4 py-3">
              <p className="text-xs font-bold text-muted-foreground">
                {PAYMENT_METHOD_LABEL[item]}
              </p>
              <p className="tabular mt-1 text-lg font-extrabold">{formatBRL(byMethod[item])}</p>
            </div>
          ))}
        </section>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]">
        <Card>
          <CardHeader>
            <CardTitle>Fechamento de contas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {awaitingTables.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {awaitingTables.map((table) => (
                  <Button
                    key={table.id}
                    size="sm"
                    variant={table.id === settlementId ? 'primary' : 'outline'}
                    onClick={() => demoSession.selectTable(table.id)}
                  >
                    Mesa {String(table.number).padStart(2, '0')}
                  </Button>
                ))}
              </div>
            ) : null}
            {settlementId ? (
              <BillSettlement tableId={settlementId} />
            ) : (
              <Banner>
                Nenhuma mesa com conta solicitada. O lançamento avulso ao lado não quita
                atendimento.
              </Banner>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lançamento avulso</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Banner>Não vincula mesa. Não informe dados de cartão.</Banner>
            <div
              className="grid grid-cols-2 gap-2"
              role="radiogroup"
              aria-label="Forma do lançamento avulso"
            >
              {methods.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={method === item.id}
                  onClick={() => setMethod(item.id)}
                  className={cn(
                    'h-12 rounded-[12px] border text-sm font-extrabold',
                    method === item.id
                      ? 'border-primary-action bg-primary-soft text-primary-strong'
                      : 'border-border',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <CurrencyInput id="payment-amount" valueCents={amount} onValueChange={setAmount} />
            <Button
              disabled={amount <= 0}
              onClick={() => {
                const ok = demoSession.registerPayment({
                  amountCents: amount,
                  method,
                  label: `Avulso ${methods.find((item) => item.id === method)?.label}`,
                });
                if (ok) {
                  setAmount(0);
                  pushToast({ title: 'Lançamento avulso registrado', tone: 'success' });
                }
              }}
            >
              Registrar avulso
            </Button>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Movimentações</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Input
              value={movementLabel}
              onChange={(event) => setMovementLabel(event.target.value)}
              aria-label="Descrição da movimentação"
            />
            <CurrencyInput valueCents={movementAmount} onValueChange={setMovementAmount} />
            <Button
              variant="outline"
              onClick={() =>
                demoSession.addCashMovement({
                  type: 'out',
                  amountCents: movementAmount,
                  label: movementLabel || 'Saída',
                })
              }
            >
              Registrar saída
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                demoSession.addCashMovement({
                  type: 'in',
                  amountCents: movementAmount,
                  label: movementLabel || 'Entrada',
                })
              }
            >
              Registrar entrada
            </Button>
          </div>
          <ul className="divide-y divide-border">
            {cash.movements.map((movement) => (
              <li key={movement.id} className="flex items-center justify-between py-3 text-sm">
                <span>
                  <span className="block font-extrabold">{movement.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(movement.at)}
                  </span>
                </span>
                <span className="tabular font-extrabold">{formatBRL(movement.amountCents)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <ConfirmationDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        title="Fechar o caixa demonstrativo?"
        description="O turno some desta sessão do navegador. Não existe conferência com banco ou adquirente."
        confirmLabel="Fechar caixa"
        tone="destructive"
        onConfirm={() => {
          demoSession.closeCash();
          pushToast({ title: 'Caixa encerrado na demonstração' });
        }}
      />
    </div>
  );
}
