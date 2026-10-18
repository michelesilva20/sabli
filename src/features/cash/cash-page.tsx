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
import { CurrencyInput, QuantityInput } from '@/design-system/components/number-input';
import { PageHeader } from '@/design-system/components/navigation';
import { pushToast } from '@/design-system/components/toast';
import { splitBill } from '@/shared/domain/bill';
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
  const session = useDemoSession();
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [amount, setAmount] = useState(0);
  const [people, setPeople] = useState(2);
  const [splitBase, setSplitBase] = useState(13420);
  const [closeOpen, setCloseOpen] = useState(false);
  const [movementLabel, setMovementLabel] = useState('Sangria');
  const [movementAmount, setMovementAmount] = useState(0);
  const form = useForm<OpenValues>({
    resolver: zodResolver(openSchema),
    defaultValues: { operator: 'Carlos Mendes', openingFloatCents: 20000, note: '' },
  });

  const cash = session.cash;
  const sales = cash?.movements.filter((item) => item.type === 'sale') ?? [];
  const salesTotal = sumCents(sales.map((item) => item.amountCents));
  const shares = splitBill(splitBase, people);

  if (!cash) {
    return (
      <div className="mx-auto grid max-w-xl gap-5">
        <PageHeader
          title="Abrir caixa"
          description="O turno fica apenas neste navegador. Nenhum valor é enviado para um adquirente."
        />
        <Banner>
          Demonstração local. Não informe dados de cartão — o Sabli não pede nem armazena esse tipo
          de informação.
        </Banner>
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
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Fundo de troco</p>
            <p className="tabular text-2xl font-extrabold">{formatBRL(cash.openingFloatCents)}</p>
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
            <p className="text-sm text-muted-foreground">Lançamentos</p>
            <p className="tabular text-2xl font-extrabold">{cash.movements.length}</p>
          </CardContent>
        </Card>
      </section>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Registrar pagamento</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Banner>Simulação local. Nenhuma transação financeira acontece.</Banner>
            <div
              className="grid grid-cols-2 gap-2"
              role="radiogroup"
              aria-label="Forma de pagamento"
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
                  label: `Pagamento ${methods.find((item) => item.id === method)?.label}`,
                });
                if (ok) {
                  setAmount(0);
                  pushToast({ title: 'Pagamento demonstrativo registrado', tone: 'success' });
                }
              }}
            >
              Registrar pagamento
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Dividir conta</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <CurrencyInput id="split-base" valueCents={splitBase} onValueChange={setSplitBase} />
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Pessoas</span>
              <QuantityInput
                value={people}
                min={1}
                max={12}
                label="pessoas na divisão"
                onChange={setPeople}
              />
            </div>
            <ul className="grid gap-1 text-sm">
              {shares.map((share, index) => (
                <li key={index} className="flex justify-between rounded-[12px] bg-muted px-3 py-2">
                  <span>Pessoa {index + 1}</span>
                  <span className="tabular font-extrabold">{formatBRL(share)}</span>
                </li>
              ))}
            </ul>
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
