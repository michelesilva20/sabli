import { Trash2 } from 'lucide-react';
import { Button } from '@/design-system/components/button';
import { QuantityInput } from '@/design-system/components/number-input';
import { OrderAmountBreakdown, OrderItemComposition } from '@/features/ordering/order-item-composition';
import { formatBRL } from '@/shared/domain/money';
import { lineTotalCents } from '@/shared/domain/order';
import {
  quotedDraftTotalCents,
  removeDraftLine,
  setDraftQuantity,
  type DraftLine,
} from '@/shared/orders/order-draft';

export function ApiOrderSummary({
  lines,
  confirmLabel,
  confirming,
  disabled,
  onConfirm,
  hint,
}: {
  lines: DraftLine[];
  confirmLabel: string;
  confirming?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  hint: string;
}) {
  const totalCents = quotedDraftTotalCents(lines);
  return (
    <aside className="grid gap-4 rounded-[20px] border border-border bg-card p-4 shadow-card lg:sticky lg:top-24">
      <div>
        <h2 className="text-lg font-extrabold">Itens do pedido</h2>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {lines.length === 0 ? (
        <p className="text-sm font-semibold text-muted-foreground">Nenhum item no rascunho.</p>
      ) : (
        <ul>
          {lines.map((line) => (
            <li key={line.localId} className="grid grid-cols-[1fr_auto] gap-2 border-b border-border py-3">
              <div>
                <OrderItemComposition
                  name={line.name}
                  notes={line.notes}
                  pizza={
                    line.pizza
                      ? {
                          sizeId: line.pizza.sizeId,
                          sizeName: line.pizza.sizeName,
                          flavors: line.pizza.flavors.map((flavor) => ({
                            id: flavor.id,
                            name: flavor.name,
                            numerator: 1,
                            denominator: line.pizza!.flavors.length,
                          })),
                          crust: {
                            id: line.pizza.crustId ?? line.pizza.sizeId,
                            name: line.pizza.crustName ?? 'tradicional',
                            priceCents: 0,
                          },
                          extras: line.pizza.extras.map((extra) => ({ ...extra, priceCents: 0 })),
                        }
                      : undefined
                  }
                />
                <p className="tabular mt-1 text-xs font-bold text-muted-foreground">
                  {formatBRL(line.quotedUnitCents)}
                </p>
              </div>
              <div className="grid justify-items-end gap-2">
                <div className="flex items-center gap-1">
                  <QuantityInput
                    value={line.quantity}
                    label={line.name}
                    onChange={(next) => setDraftQuantity(line.localId, next)}
                  />
                  {line.quantity === 1 ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-9"
                      aria-label={`Remover ${line.name}`}
                      onClick={() => removeDraftLine(line.localId)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  ) : null}
                </div>
                <p className="tabular text-sm font-extrabold">
                  {formatBRL(lineTotalCents({ quantity: line.quantity, unitPriceCents: line.quotedUnitCents }))}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <OrderAmountBreakdown subtotalCents={totalCents} discountCents={0} totalCents={totalCents} />
      <Button onClick={onConfirm} loading={confirming} disabled={disabled || lines.length === 0}>
        {confirmLabel}
      </Button>
    </aside>
  );
}
