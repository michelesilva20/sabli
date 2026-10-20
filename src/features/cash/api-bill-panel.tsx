import { useEffect, useRef, useState } from 'react';
import { Alert, Banner, Skeleton } from '@/design-system/components/feedback';
import { Button } from '@/design-system/components/button';
import { CurrencyInput, QuantityInput } from '@/design-system/components/number-input';
import { pushToast } from '@/design-system/components/toast';
import {
  OrderAmountBreakdown,
  OrderItemComposition,
} from '@/features/ordering/order-item-composition';
import {
  BILL_STATUS_LABEL,
  billChannelLabel,
  toApiPaymentMethod,
  toUiPaymentMethod,
  type BillResponse,
} from '@/shared/api/billing';
import {
  financeErrorMessage,
  useBillQuery,
  useRegisterPaymentMutation,
} from '@/shared/api/billing-queries';
import { useCurrentCashQuery } from '@/shared/api/cash-queries';
import { useCloseServiceMutation } from '@/shared/api/dining-queries';
import { ApiError, ApiUnavailableError } from '@/shared/api/http-client';
import { toPizzaComposition } from '@/shared/api/orders';
import {
  canCloseSettledTable,
  canFinance,
  useAuthSession,
} from '@/shared/auth/session';
import { applyTender, PAYMENT_METHOD_LABEL, splitBill } from '@/shared/domain/bill';
import { formatBRL } from '@/shared/domain/money';
import { peekPaymentAttempt } from '@/shared/billing/payment-attempt';
import type { PaymentMethod } from '@/shared/types/domain';
import { cn } from '@/shared/utils/cn';

const methods: { id: Exclude<PaymentMethod, 'voucher'>; label: string }[] = [
  { id: 'cash', label: 'Dinheiro' },
  { id: 'pix', label: 'Pix' },
  { id: 'debit', label: 'Débito' },
  { id: 'credit', label: 'Crédito' },
];

export function ApiBillPanel({
  billId,
  guests = 2,
  onClosed,
}: {
  billId: string;
  guests?: number;
  onClosed?: () => void;
}) {
  const session = useAuthSession();
  const establishmentId = session.context?.establishment?.id;
  const canPay = canFinance(session.context);
  const canClose = canCloseSettledTable(session.context);
  const billQuery = useBillQuery(billId);
  const cashQuery = useCurrentCashQuery(canPay);
  const payMutation = useRegisterPaymentMutation();
  const closeMutation = useCloseServiceMutation();
  const payingRef = useRef(false);
  const bill = billQuery.data;
  const remaining = bill?.remainingCents ?? 0;
  const [method, setMethod] = useState<Exclude<PaymentMethod, 'voucher'>>('pix');
  const [amount, setAmount] = useState(0);
  const [people, setPeople] = useState(Math.max(2, guests));
  const [timeoutHint, setTimeoutHint] = useState(false);

  useEffect(() => {
    setAmount(remaining);
    setPeople(Math.max(2, guests));
    setTimeoutHint(Boolean(peekPaymentAttempt(billId)));
  }, [billId, guests, remaining]);

  if (billQuery.isLoading) {
    return <Skeleton className="h-64" />;
  }
  if (billQuery.error) {
    const forbidden = billQuery.error instanceof ApiError && billQuery.error.status === 403;
    return (
      <Alert title={forbidden ? 'Acesso negado' : 'Não foi possível carregar a conta'} tone="danger">
        {forbidden
          ? 'Cozinha não consulta dados financeiros detalhados.'
          : financeErrorMessage(billQuery.error)}
      </Alert>
    );
  }
  if (!bill || !establishmentId) {
    return <Banner>Selecione uma conta persistida para conferir o saldo.</Banner>;
  }

  const shares = splitBill(Math.max(remaining, 0), people);
  const preview =
    remaining > 0 ? applyTender({ remainingCents: remaining, method, tenderedCents: amount }) : null;
  const cashOpen = cashQuery.data?.status === 'OPEN';
  const busy = payMutation.isPending || closeMutation.isPending;

  function pay(tenderedCents: number) {
    if (!bill || !establishmentId || payingRef.current || busy) return;
    payingRef.current = true;
    payMutation.mutate(
      {
        establishmentId,
        billId: bill.id,
        body: {
          method: toApiPaymentMethod(method),
          tenderedCents,
          version: bill.version,
        },
      },
      {
        onSuccess: (payment) => {
          payingRef.current = false;
          setTimeoutHint(false);
          const nextRemaining = Math.max(0, remaining - payment.appliedCents);
          pushToast({
            title: nextRemaining === 0 ? `${billChannelLabel(bill)} quitada` : 'Pagamento registrado',
            description:
              payment.changeCents > 0
                ? `Aplicado ${formatBRL(payment.appliedCents)} · troco ${formatBRL(payment.changeCents)}`
                : 'Confirmação do servidor. Declaração manual, sem verificação bancária.',
            tone: 'success',
          });
        },
        onError: (error) => {
          payingRef.current = false;
          if (error instanceof ApiUnavailableError) setTimeoutHint(true);
          pushToast({
            title: 'Pagamento não confirmado',
            description: financeErrorMessage(error),
            tone: 'danger',
          });
        },
      },
    );
  }

  function closeTable() {
    if (!bill?.tableId || busy) return;
    closeMutation.mutate({ tableId: bill.tableId }, {
      onSuccess: () => {
        pushToast({
          title: `${billChannelLabel(bill)} liberada`,
          description: 'O atendimento foi encerrado no servidor. O histórico financeiro permanece.',
          tone: 'success',
        });
        onClosed?.();
      },
      onError: (error) => {
        pushToast({
          title: 'Não foi possível encerrar',
          description: financeErrorMessage(error),
          tone: 'danger',
        });
      },
    });
  }

  return (
    <div className="grid gap-4">
      <BillSummary bill={bill} guests={guests} />
      {timeoutHint ? (
        <Alert title="Confirmação em aberto" tone="warning">
          A última tentativa não teve resposta. Uma nova confirmação reutiliza a mesma chave para
          não duplicar o pagamento.
        </Alert>
      ) : null}
      {canPay && !cashOpen && remaining > 0 ? (
        <Alert title="Caixa fechado" tone="warning">
          Abra o caixa deste estabelecimento antes de registrar um pagamento.
        </Alert>
      ) : null}
      {!canPay && remaining > 0 ? (
        <Banner>Consulta liberada. Só o caixa registra pagamentos neste estabelecimento.</Banner>
      ) : null}
      {bill.settled && bill.totalCents > 0 && canClose && bill.kind === 'TABLE' ? (
        <Button onClick={closeTable} loading={closeMutation.isPending} disabled={busy}>
          Encerrar atendimento
        </Button>
      ) : null}
      {bill.settled && bill.kind === 'COUNTER' ? (
        <Banner>Conta de balcão quitada. Não há mesa para encerrar.</Banner>
      ) : null}
      {!bill.settled && canPay ? (
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
          {method !== 'cash' ? (
            <Banner>
              {PAYMENT_METHOD_LABEL[method]} é declaração manual do operador. O Sabli não consulta
              banco, PIX nem adquirente.
            </Banner>
          ) : (
            <Banner>
              Informe o valor recebido em espécie. A receita da conta é o valor aplicado, não o
              recebido. O troco vem da confirmação do servidor.
            </Banner>
          )}
          <label className="grid gap-1 text-sm font-bold">
            {method === 'cash' ? 'Valor recebido em dinheiro' : 'Valor do pagamento'}
            <CurrencyInput id="settlement-amount" valueCents={amount} onValueChange={setAmount} />
          </label>
          {preview?.ok && method === 'cash' && preview.changeCents > 0 ? (
            <p className="text-sm font-bold">
              Prévia: aplicado {formatBRL(preview.appliedCents)} · troco {formatBRL(preview.changeCents)}
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
          <Button
            onClick={() => pay(amount)}
            disabled={amount <= 0 || !cashOpen || busy}
            loading={payMutation.isPending}
          >
            {payMutation.isPending ? 'Registrando pagamento' : 'Registrar pagamento'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => pay(remaining)}
            disabled={remaining <= 0 || !cashOpen || busy}
          >
            Pagar o restante
          </Button>
          <p className="text-xs font-semibold text-muted-foreground">
            O Sabli não pede nem armazena número de cartão, CVV ou chave PIX do cliente.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function BillSummary({ bill, guests }: { bill: BillResponse; guests?: number | null }) {
  return (
    <div className="grid gap-4">
      <div>
        <p className="text-xs font-extrabold text-muted-foreground">
          Conferência · {billChannelLabel(bill)}
        </p>
        <p className="mt-1 text-2xl font-extrabold tabular-nums">{formatBRL(bill.totalCents)}</p>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          {BILL_STATUS_LABEL[bill.status]}
          {guests ? ` · ${guests} ${guests === 1 ? 'pessoa' : 'pessoas'}` : ''}
        </p>
      </div>
      {bill.status === 'SETTLED' ? (
        <Alert title="Conta quitada" tone="success">
          O backend devolveu SETTLED. O saldo restante é zero. Pagamentos adicionais ficam
          bloqueados.
        </Alert>
      ) : bill.status === 'PARTIALLY_PAID' ? (
        <Alert title="Pagamento parcial" tone="warning">
          A mesa permanece ocupada até a quitação integral confirmada pelo servidor.
        </Alert>
      ) : (
        <Alert title="Conta pendente" tone="warning">
          Nenhum pagamento foi confirmado nesta conta.
        </Alert>
      )}
      {bill.orders.map((order) => (
        <div key={order.id} className="grid gap-2 rounded-[16px] bg-muted px-3 py-3">
          <p className="text-sm font-extrabold">Pedido #{order.number}</p>
          <ul className="grid gap-2">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-2 text-sm">
                <span className="font-extrabold">{item.quantity}×</span>
                <OrderItemComposition
                  name={item.productName ?? 'Item'}
                  notes={item.notes ?? undefined}
                  pizza={toPizzaComposition(item.pizza)}
                />
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
      {bill.orders.length === 0 ? (
        <Banner>Nenhum pedido confirmado nesta conta.</Banner>
      ) : null}
      {bill.payments.length > 0 ? (
        <ul className="grid gap-2">
          <p className="text-xs font-extrabold text-muted-foreground">Pagamentos registrados</p>
          {bill.payments.map((payment) => (
            <li
              key={payment.id}
              className="flex items-center justify-between rounded-[14px] bg-muted px-3 py-2 text-sm"
            >
              <span className="font-bold">
                {PAYMENT_METHOD_LABEL[toUiPaymentMethod(payment.method)]}
                {payment.changeCents > 0 ? ` · troco ${formatBRL(payment.changeCents)}` : ''}
              </span>
              <span className="tabular font-extrabold">{formatBRL(payment.appliedCents)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <dl className="grid gap-1 text-sm">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd className="tabular font-bold">{formatBRL(bill.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Descontos</dt>
          <dd className="tabular font-bold">{formatBRL(bill.discountCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Total da conta</dt>
          <dd className="tabular font-bold">{formatBRL(bill.totalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Total pago</dt>
          <dd className="tabular font-bold">{formatBRL(bill.paidCents)}</dd>
        </div>
        <div className="flex justify-between text-base font-extrabold">
          <dt>Saldo restante</dt>
          <dd className="tabular">{formatBRL(bill.remainingCents)}</dd>
        </div>
      </dl>
    </div>
  );
}
