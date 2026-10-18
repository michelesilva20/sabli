import { useEffect, useRef, useState } from 'react';
import { Alert, Banner } from '@/design-system/components/feedback';
import { Button } from '@/design-system/components/button';
import { CurrencyInput, QuantityInput } from '@/design-system/components/number-input';
import { pushToast } from '@/design-system/components/toast';
import {
  OrderAmountBreakdown,
  OrderItemComposition,
} from '@/features/ordering/order-item-composition';
import { applyTender, PAYMENT_METHOD_LABEL, splitBill } from '@/shared/domain/bill';
import { formatBRL } from '@/shared/domain/money';
import {
  activeServiceFor,
  checkAccumulatedCents,
  demoSession,
  ordersForService,
  paymentsForService,
  servicePaidCents,
  serviceRemainingCents,
  useDemoSession,
} from '@/shared/demo/session';
import type { PaymentMethod } from '@/shared/types/domain';
import { cn } from '@/shared/utils/cn';

const methods: { id: PaymentMethod; label: string }[] = [
  { id: 'cash', label: 'Dinheiro' },
  { id: 'pix', label: 'Pix' },
  { id: 'debit', label: 'Débito' },
  { id: 'credit', label: 'Crédito' },
];

export function BillSettlement({ tableId }: { tableId: string }) {
  const session = useDemoSession();
  const payingRef = useRef(false);
  const table = session.tables.find((item) => item.id === tableId);
  const service = activeServiceFor(session.services, tableId);
  const orders = service ? ordersForService(session.localOrders, service) : [];
  const payments = service ? paymentsForService(session.payments, service.id) : [];
  const totalCents = service ? checkAccumulatedCents(service, session.localOrders) : 0;
  const paid = service ? servicePaidCents(session.payments, service.id) : 0;
  const remaining = service
    ? serviceRemainingCents(service, session.localOrders, session.payments)
    : 0;
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [amount, setAmount] = useState(remaining);
  const [people, setPeople] = useState(Math.max(2, table?.guests || 2));

  useEffect(() => {
    setAmount(remaining);
  }, [remaining, tableId]);

  if (!table || !service || table.status !== 'awaiting_bill') {
    return (
      <Banner>Selecione uma mesa com conta solicitada para conferir e receber o pagamento.</Banner>
    );
  }

  const shares = splitBill(remaining, people);
  const preview =
    remaining > 0
      ? applyTender({ remainingCents: remaining, method, tenderedCents: amount })
      : null;
  const settled = remaining === 0;
  const pad = String(table.number).padStart(2, '0');

  function pay(tenderedCents: number) {
    if (payingRef.current) return;
    payingRef.current = true;
    const result = demoSession.payBill(tableId, { method, tenderedCents });
    payingRef.current = false;
    if (!result.ok) {
      const messages: Record<string, string> = {
        cash_closed: 'Abra o caixa para registrar o pagamento demonstrativo.',
        settled: 'Esta conta já está quitada.',
        over_remaining: 'O valor eletrônico não pode ultrapassar o saldo restante.',
        empty: 'Informe um valor maior que zero.',
        duplicate: 'Pagamento já registrado. Evite o clique duplo.',
        bill_required: 'Solicite a conta antes de receber.',
        not_found: 'Atendimento não encontrado.',
      };
      pushToast({
        title: 'Pagamento não registrado',
        description: messages[result.reason] ?? 'Transição inválida.',
        tone: 'danger',
      });
      return;
    }
    pushToast({
      title:
        result.remainingCents === 0
          ? `Conta da mesa ${pad} quitada`
          : `Pagamento da mesa ${pad} registrado`,
      description:
        result.changeCents > 0
          ? `Troco ${formatBRL(result.changeCents)}. Nada disso é uma transação real.`
          : 'Confirmação demonstrativa do operador. Nenhum pagamento real.',
      tone: 'success',
    });
  }

  function closeTable() {
    const result = demoSession.closeService(tableId);
    if (result.ok) {
      pushToast({
        title: `Mesa ${pad} liberada`,
        description: 'Encerramento demonstrativo. O histórico de pedidos e pagamentos permanece.',
        tone: 'success',
      });
      return;
    }
    pushToast({
      title: 'Não foi possível encerrar',
      description:
        result.reason === 'unpaid'
          ? 'Quite o saldo restante antes de liberar a mesa.'
          : 'A mesa só encerra com a conta solicitada e quitada.',
      tone: 'danger',
    });
  }

  return (
    <div className="grid gap-4">
      <div>
        <p className="text-xs font-extrabold text-muted-foreground">Conferência da mesa {pad}</p>
        <p className="mt-1 text-2xl font-extrabold tabular-nums">{formatBRL(totalCents)}</p>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          {table.guests} {table.guests === 1 ? 'pessoa' : 'pessoas'} · {service.hostName}
        </p>
      </div>
      {settled ? (
        <Alert title="Conta quitada" tone="success">
          O saldo restante é zero. Encerre o atendimento para liberar a mesa.
        </Alert>
      ) : (
        <Alert title="Conta pendente" tone="warning">
          Pagamentos parciais mantêm a mesa ocupada até a quitação integral.
        </Alert>
      )}
      {service.seedBalanceCents > 0 ? (
        <div className="rounded-[16px] bg-muted px-3 py-3">
          <p className="text-xs font-extrabold text-muted-foreground">
            Saldo demonstrativo anterior
          </p>
          <p className="mt-1 text-sm font-bold">
            Consumo de exemplo já registrado nesta mesa, sem itens detalhados nesta sessão.
          </p>
          <p className="tabular mt-2 text-base font-extrabold">
            {formatBRL(service.seedBalanceCents)}
          </p>
        </div>
      ) : null}
      {orders.map((order) => (
        <div key={order.id} className="grid gap-2 rounded-[16px] bg-muted px-3 py-3">
          <p className="text-sm font-extrabold">Pedido #{order.number}</p>
          <ul className="grid gap-2">
            {order.items.map((item, index) => (
              <li key={item.lineId ?? `${item.name}-${index}`} className="flex gap-2 text-sm">
                <span className="font-extrabold">{item.quantity}×</span>
                <OrderItemComposition name={item.name} notes={item.notes} pizza={item.pizza} />
              </li>
            ))}
          </ul>
          <OrderAmountBreakdown
            subtotalCents={order.subtotalCents}
            discountCents={order.discountCents}
            totalCents={order.totalCents}
          />
        </div>
      ))}
      {payments.length > 0 ? (
        <ul className="grid gap-2">
          <p className="text-xs font-extrabold text-muted-foreground">Pagamentos registrados</p>
          {payments.map((payment) => (
            <li
              key={payment.id}
              className="flex items-center justify-between rounded-[14px] bg-muted px-3 py-2 text-sm"
            >
              <span className="font-bold">{PAYMENT_METHOD_LABEL[payment.method]}</span>
              <span className="tabular font-extrabold">{formatBRL(payment.appliedCents)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <dl className="grid gap-1 text-sm">
        <div className="flex justify-between">
          <dt>Total da conta</dt>
          <dd className="tabular font-bold">{formatBRL(totalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Total pago</dt>
          <dd className="tabular font-bold">{formatBRL(paid)}</dd>
        </div>
        <div className="flex justify-between text-base font-extrabold">
          <dt>Saldo restante</dt>
          <dd className="tabular">{formatBRL(remaining)}</dd>
        </div>
      </dl>
      {settled ? (
        <Button onClick={closeTable}>Encerrar atendimento</Button>
      ) : (
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Forma de pagamento">
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
          <label className="grid gap-1 text-sm font-bold">
            {method === 'cash' ? 'Valor recebido em dinheiro' : 'Valor do pagamento'}
            <CurrencyInput id="settlement-amount" valueCents={amount} onValueChange={setAmount} />
          </label>
          {preview?.ok && method === 'cash' && preview.changeCents > 0 ? (
            <p className="text-sm font-bold">
              Pagamento aplicado {formatBRL(preview.appliedCents)} · troco{' '}
              {formatBRL(preview.changeCents)}
            </p>
          ) : null}
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">Dividir o restante</span>
            <QuantityInput
              value={people}
              min={1}
              max={12}
              label="pessoas na divisão"
              onChange={setPeople}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {shares.map((share, index) => (
              <Button
                key={`${share}-${index}`}
                type="button"
                size="sm"
                variant="outline"
                disabled={share <= 0}
                onClick={() => setAmount(share)}
              >
                Cota {index + 1} · {formatBRL(share)}
              </Button>
            ))}
          </div>
          <Button onClick={() => pay(amount)} disabled={amount <= 0}>
            Registrar pagamento
          </Button>
          <Button variant="secondary" onClick={() => pay(remaining)} disabled={remaining <= 0}>
            Pagar o restante
          </Button>
          <p className="text-xs font-semibold text-muted-foreground">
            Confirmação do operador. O Sabli não pede nem armazena dados de cartão.
          </p>
        </div>
      )}
    </div>
  );
}
