import { flavorPortionLabel } from '@/shared/domain/order';
import { formatBRL } from '@/shared/domain/money';
import type { PizzaComposition } from '@/shared/types/domain';
import { cn } from '@/shared/utils/cn';

export function OrderItemComposition({
  name,
  notes,
  pizza,
  nameClassName,
}: {
  name: string;
  notes?: string;
  pizza?: PizzaComposition;
  nameClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <p className={cn('font-extrabold', nameClassName ?? 'text-sm')}>{name}</p>
      {pizza ? (
        <ul className="mt-1 grid gap-0.5 text-xs font-semibold text-muted-foreground">
          {pizza.flavors.map((flavor) => (
            <li key={flavor.id}>{flavorPortionLabel(flavor)}</li>
          ))}
          <li>Borda de {pizza.crust.name}</li>
          {pizza.extras.map((extra) => (
            <li key={extra.id}>Adicional: {extra.name}</li>
          ))}
        </ul>
      ) : null}
      {notes ? <p className="mt-1 text-xs font-semibold text-muted-foreground">{notes}</p> : null}
    </div>
  );
}

export function OrderAmountBreakdown({
  subtotalCents,
  discountCents,
  totalCents,
}: {
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
}) {
  return (
    <dl className="grid gap-1 text-sm">
      <div className="flex justify-between gap-3">
        <dt>Subtotal</dt>
        <dd className="tabular font-bold">{formatBRL(subtotalCents)}</dd>
      </div>
      {discountCents > 0 ? (
        <div className="flex justify-between gap-3 text-muted-foreground">
          <dt>Desconto ilustrativo de 10%</dt>
          <dd className="tabular">− {formatBRL(discountCents)}</dd>
        </div>
      ) : null}
      <div className="flex justify-between gap-3 text-base font-extrabold">
        <dt>Total</dt>
        <dd className="tabular">{formatBRL(totalCents)}</dd>
      </div>
    </dl>
  );
}
