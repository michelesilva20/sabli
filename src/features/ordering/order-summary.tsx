import { QuantityInput } from '@/design-system/components/number-input';
import { Button } from '@/design-system/components/button';
import { Switch } from '@/design-system/components/choice';
import {
  OrderAmountBreakdown,
  OrderItemComposition,
} from '@/features/ordering/order-item-composition';
import {
  demoSession,
  selectOrderTotals,
  useDemoSession,
  type OrderLine,
} from '@/shared/demo/session';
import { formatBRL } from '@/shared/domain/money';
import { lineTotalCents } from '@/shared/domain/order';

export function OrderItemRow({ line }: { line: OrderLine }) {
  return (
    <li className="grid grid-cols-[1fr_auto] gap-2 border-b border-border py-3">
      <div>
        <OrderItemComposition name={line.name} notes={line.notes} pizza={line.pizza} />
        <p className="tabular mt-1 text-xs font-bold text-muted-foreground">
          {formatBRL(line.unitPriceCents)}
        </p>
      </div>
      <div className="grid justify-items-end gap-2">
        <QuantityInput
          value={line.quantity}
          label={line.name}
          onChange={(next) => demoSession.setQuantity(line.id, next)}
        />
        <p className="tabular text-sm font-extrabold">
          {formatBRL(
            lineTotalCents({ quantity: line.quantity, unitPriceCents: line.unitPriceCents }),
          )}
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
            <OrderItemRow key={line.id} line={line} />
          ))}
        </ul>
      )}
      <Switch
        checked={session.discountPercent > 0}
        onCheckedChange={demoSession.setDiscount}
        label="Desconto ilustrativo de 10%"
        description="Não representa uma promoção real."
      />
      <OrderAmountBreakdown
        subtotalCents={totals.subtotalCents}
        discountCents={totals.discountCents}
        totalCents={totals.totalCents}
      />
      {onConfirm ? (
        <Button size="lg" disabled={session.lines.length === 0} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      ) : null}
    </aside>
  );
}
