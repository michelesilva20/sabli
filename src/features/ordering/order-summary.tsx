import { QuantityInput } from '@/design-system/components/number-input';
import { Button } from '@/design-system/components/button';
import { Switch } from '@/design-system/components/choice';
import { demoSession, selectOrderTotals, useDemoSession } from '@/shared/demo/session';
import { formatBRL } from '@/shared/domain/money';
import { lineTotalCents } from '@/shared/domain/order';

export function OrderItemRow({
  id,
  name,
  detail,
  quantity,
  unitPriceCents,
}: {
  id: string;
  name: string;
  detail?: string;
  quantity: number;
  unitPriceCents: number;
}) {
  return (
    <li className="grid grid-cols-[1fr_auto] gap-2 border-b border-border py-3">
      <div>
        <p className="text-sm font-extrabold">{name}</p>
        {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
        <p className="tabular text-xs font-bold text-muted-foreground">
          {formatBRL(unitPriceCents)}
        </p>
      </div>
      <div className="grid justify-items-end gap-2">
        <QuantityInput
          value={quantity}
          label={name}
          onChange={(next) => demoSession.setQuantity(id, next)}
        />
        <p className="tabular text-sm font-extrabold">
          {formatBRL(lineTotalCents({ quantity, unitPriceCents }))}
        </p>
      </div>
    </li>
  );
}

export function OrderSummary({
  onConfirm,
  confirmLabel = 'Enviar para cozinha',
  compact = false,
}: {
  onConfirm?: () => void;
  confirmLabel?: string;
  compact?: boolean;
}) {
  const session = useDemoSession();
  const totals = selectOrderTotals(session);
  return (
    <aside
      className={
        compact
          ? 'grid gap-3'
          : 'grid gap-4 rounded-[20px] border border-border bg-card p-4 shadow-card lg:sticky lg:top-24'
      }
    >
      <div>
        <h2 className="text-lg font-extrabold">Itens do pedido</h2>
        <p className="text-xs text-muted-foreground">Rascunho local desta demonstração.</p>
      </div>
      {session.lines.length === 0 ? (
        <p className="rounded-[12px] bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
          Nenhum item adicionado.
        </p>
      ) : (
        <ul>
          {session.lines.map((line) => (
            <OrderItemRow key={line.id} {...line} />
          ))}
        </ul>
      )}
      <Switch
        checked={session.discountPercent > 0}
        onCheckedChange={demoSession.setDiscount}
        label="Desconto ilustrativo de 10%"
        description="Não representa uma promoção real."
      />
      <dl className="grid gap-1 text-sm">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd className="tabular font-bold">{formatBRL(totals.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <dt>Desconto</dt>
          <dd className="tabular">− {formatBRL(totals.discountCents)}</dd>
        </div>
        <div className="flex justify-between text-base font-extrabold">
          <dt>Total</dt>
          <dd className="tabular">{formatBRL(totals.totalCents)}</dd>
        </div>
      </dl>
      {onConfirm ? (
        <Button size="lg" disabled={session.lines.length === 0} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      ) : null}
    </aside>
  );
}
