import { flavorPortionLabel } from '@/shared/domain/order';
import { formatBRL } from '@/shared/domain/money';
import type { PizzaSizeRule } from '@/shared/domain/pizza';
import type { PizzaCrust, PizzaExtra, PizzaFlavor } from '@/shared/types/domain';

export function PizzaBuildSummary({
  size,
  flavors,
  crust,
  extras,
  quantity,
  unitPriceCents,
  compact = false,
}: {
  size: PizzaSizeRule;
  flavors: PizzaFlavor[];
  crust?: PizzaCrust;
  extras: PizzaExtra[];
  quantity: number;
  unitPriceCents: number | null;
  compact?: boolean;
}) {
  const totalCents = unitPriceCents === null ? null : unitPriceCents * quantity;
  const denominator = flavors.length;
  const flavorText =
    flavors.length === 0
      ? 'sem sabor'
      : flavors
          .map((flavor) =>
            denominator > 1
              ? flavorPortionLabel({
                  id: flavor.id,
                  name: flavor.name,
                  numerator: 1,
                  denominator,
                })
              : flavor.name,
          )
          .join(', ');

  if (compact) {
    return (
      <aside className="flex items-center justify-between gap-3 rounded-[14px] border border-border bg-card px-3 py-2 shadow-card">
        <p className="min-w-0 truncate text-sm font-extrabold">
          {size.name} · {quantity}× · {flavorText}
        </p>
        <p className="tabular shrink-0 text-sm font-extrabold">
          {totalCents === null ? 'Selecione um sabor' : formatBRL(totalCents)}
        </p>
      </aside>
    );
  }

  return (
    <aside className="sticky top-24 rounded-[18px] border border-border bg-card p-4 shadow-card">
      <p className="text-xs font-extrabold tracking-wide text-muted-foreground uppercase">
        Resumo da pizza
      </p>
      <dl className="mt-2 grid gap-1.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Tamanho</dt>
          <dd className="font-extrabold">{size.name}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Sabores</dt>
          <dd className="text-right font-bold">{flavors.length === 0 ? 'Nenhum' : flavorText}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Borda</dt>
          <dd className="font-bold">{crust?.name ?? 'Tradicional'}</dd>
        </div>
        {extras.length > 0 ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Adicionais</dt>
            <dd className="text-right font-bold">{extras.map((extra) => extra.name).join(', ')}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Quantidade</dt>
          <dd className="tabular font-extrabold">{quantity}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Unitário</dt>
          <dd className="tabular font-extrabold">
            {unitPriceCents === null ? '—' : formatBRL(unitPriceCents)}
          </dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-border pt-2 text-base">
          <dt className="font-extrabold">Total</dt>
          <dd className="tabular font-extrabold">
            {totalCents === null ? 'Selecione um sabor' : formatBRL(totalCents)}
          </dd>
        </div>
      </dl>
    </aside>
  );
}
