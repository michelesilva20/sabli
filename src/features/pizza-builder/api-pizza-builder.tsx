import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Breadcrumb } from '@/design-system/components/navigation';
import { Alert, EmptyState, Skeleton } from '@/design-system/components/feedback';
import { Button } from '@/design-system/components/button';
import { RadioGroup } from '@/design-system/components/choice';
import { QuantityInput } from '@/design-system/components/number-input';
import { usePizzaMenuQuery, usePizzaQuoteQuery } from '@/shared/api/catalog-queries';
import { strategyLabel } from '@/shared/api/catalog';
import { formatBRL } from '@/shared/domain/money';
import { cn } from '@/shared/utils/cn';

export function ApiPizzaBuilderPage() {
  return (
    <div className="grid gap-4">
      <Breadcrumb items={[{ label: 'PDV', to: '/pdv' }, { label: 'Montar pizza' }]} />
      <div>
        <h1 className="text-2xl font-extrabold">Montar pizza</h1>
        <p className="text-sm text-muted-foreground">
          Tamanhos, sabores e preço vêm do servidor. A cotação não confirma pedido.
        </p>
      </div>
      <ApiPizzaBuilder />
    </div>
  );
}

export function ApiPizzaBuilder() {
  const navigate = useNavigate();
  const menu = usePizzaMenuQuery();
  const [sizeId, setSizeId] = useState('');
  const [flavorIds, setFlavorIds] = useState<string[]>([]);
  const [crustId, setCrustId] = useState('none');
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);

  const sizes = menu.data?.sizes.filter((item) => item.available && item.status === 'ACTIVE') ?? [];
  const flavors = menu.data?.flavors.filter((item) => item.available && item.status === 'ACTIVE') ?? [];
  const crusts = menu.data?.crusts.filter((item) => item.available && item.status === 'ACTIVE') ?? [];
  const extras = menu.data?.extras.filter((item) => item.available && item.status === 'ACTIVE') ?? [];
  const size = sizes.find((item) => item.id === sizeId) ?? sizes[0];
  const overLimit = Boolean(size && flavorIds.length > size.maxFlavors);
  const quote = usePizzaQuoteQuery({
    sizeId: size?.id,
    flavorIds,
    crustId: crustId === 'none' ? undefined : crustId,
    extraIds,
    quantity,
  });

  function toggleFlavor(id: string) {
    setFlavorIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (size && current.length >= size.maxFlavors) return current;
      return [...current, id];
    });
  }

  if (menu.isLoading) {
    return <Skeleton className="h-64" />;
  }
  if (menu.isError) {
    return (
      <EmptyState
        title="Não foi possível carregar o cardápio de pizza"
        description="A consulta ao servidor falhou. Tente de novo."
        action={
          <Button variant="outline" onClick={() => void menu.refetch()}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-5">
      <Alert title="Pedido ainda não é enviado neste modo">
        Você pode montar e ver a cotação do servidor. A confirmação real chega em um próximo
        checkpoint.
      </Alert>
      <section className="grid gap-2">
        <h2 className="text-sm font-extrabold">Tamanho</h2>
        <RadioGroup
          value={size?.id ?? ''}
          onValueChange={(value) => {
            setSizeId(value);
            setFlavorIds([]);
          }}
          options={sizes.map((item) => ({
            value: item.id,
            label: item.name,
            description: `Até ${item.maxFlavors} ${item.maxFlavors === 1 ? 'sabor' : 'sabores'} · ${item.slices} fatias`,
          }))}
        />
      </section>
      <section className="grid gap-2">
        <h2 className="text-sm font-extrabold">Sabores</h2>
        {overLimit ? (
          <Alert title="Limite de sabores" tone="warning">
            {size?.name} aceita até {size?.maxFlavors}.
          </Alert>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          {flavors.map((flavor) => {
            const selected = flavorIds.includes(flavor.id);
            const blocked = Boolean(size && !selected && flavorIds.length >= size.maxFlavors);
            return (
              <button
                key={flavor.id}
                type="button"
                disabled={blocked}
                onClick={() => toggleFlavor(flavor.id)}
                className={cn(
                  'rounded-[14px] border px-3 py-3 text-left text-sm font-bold',
                  selected ? 'border-primary-action bg-muted' : 'border-border bg-card',
                )}
              >
                {flavor.name}
              </button>
            );
          })}
        </div>
      </section>
      <section className="grid gap-2">
        <h2 className="text-sm font-extrabold">Borda</h2>
        <RadioGroup
          value={crustId}
          onValueChange={setCrustId}
          options={[
            { value: 'none', label: 'Sem borda extra' },
            ...crusts.map((crust) => ({
              value: crust.id,
              label: crust.name,
              description: formatBRL(crust.priceCents),
            })),
          ]}
        />
      </section>
      <section className="grid gap-2">
        <h2 className="text-sm font-extrabold">Adicionais</h2>
        {extras.map((extra) => {
          const selected = extraIds.includes(extra.id);
          return (
            <label key={extra.id} className="flex items-center justify-between gap-3 rounded-[12px] border border-border bg-card px-3 py-3 text-sm font-bold">
              <span>
                {extra.name} · {formatBRL(extra.priceCents)}
              </span>
              <input
                type="checkbox"
                checked={selected}
                onChange={() =>
                  setExtraIds((current) =>
                    selected ? current.filter((id) => id !== extra.id) : [...current, extra.id],
                  )
                }
              />
            </label>
          );
        })}
      </section>
      <QuantityInput value={quantity} onChange={setQuantity} min={1} max={20} label="Quantidade" />
      {quote.isFetching ? <p className="text-xs font-bold text-muted-foreground">Cotando no servidor…</p> : null}
      {quote.data && !overLimit ? (
        <Alert title={`Total ${formatBRL(quote.data.totalCents)}`}>
          {strategyLabel(quote.data.strategy)} · unitário {formatBRL(quote.data.unitCents)}. Este valor
          é informativo e não reserva preço.
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button disabled>Adicionar ao pedido</Button>
        <Button variant="outline" onClick={() => navigate('/pdv')}>
          Voltar ao PDV
        </Button>
      </div>
    </div>
  );
}
