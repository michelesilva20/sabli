import { useState } from 'react';
import { Alert, EmptyState, Skeleton } from '@/design-system/components/feedback';
import { Button } from '@/design-system/components/button';
import { FormField } from '@/design-system/components/form-field';
import { Input } from '@/design-system/components/input';
import { RadioGroup } from '@/design-system/components/choice';
import { Sheet } from '@/design-system/components/sheet';
import { pushToast } from '@/design-system/components/toast';
import {
  centsToReaisInput,
  reaisToCents,
  strategyLabel,
  type CatalogPricingStrategy,
} from '@/shared/api/catalog';
import {
  usePizzaMenuQuery,
  usePizzaQuoteQuery,
  usePizzaStrategyMutation,
  useUpdateFlavorMutation,
} from '@/shared/api/catalog-queries';
import { formatBRL } from '@/shared/domain/money';
import { ApiError } from '@/shared/api/http-client';

export function ApiPizzaConfig({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const menu = usePizzaMenuQuery(open);
  const strategyMutation = usePizzaStrategyMutation();
  const flavorMutation = useUpdateFlavorMutation();
  const [sizeId, setSizeId] = useState('');
  const [flavorId, setFlavorId] = useState('');
  const [crustId, setCrustId] = useState('');
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});

  const sizes = menu.data?.sizes.filter((item) => item.status === 'ACTIVE') ?? [];
  const flavors = menu.data?.flavors.filter((item) => item.status === 'ACTIVE') ?? [];
  const crusts = menu.data?.crusts.filter((item) => item.status === 'ACTIVE') ?? [];
  const extras = menu.data?.extras.filter((item) => item.status === 'ACTIVE') ?? [];
  const selectedSize = sizes.find((item) => item.id === sizeId) ?? sizes[0];
  const selectedFlavor = flavors.find((item) => item.id === flavorId) ?? flavors[0];

  const quote = usePizzaQuoteQuery({
    sizeId: selectedSize?.id,
    flavorIds: selectedFlavor ? [selectedFlavor.id] : [],
    crustId: crustId || undefined,
    extraIds,
    quantity: 1,
  });

  function saveStrategy(strategy: CatalogPricingStrategy) {
    if (!menu.data) return;
    strategyMutation.mutate(
      { strategy, version: menu.data.settings.version },
      {
        onSuccess: () => pushToast({ title: 'Estratégia atualizada', tone: 'success' }),
        onError: (error) =>
          pushToast({
            title: error instanceof ApiError && error.status === 403 ? 'Você não pode alterar a pizza.' : 'Não foi possível salvar.',
            tone: 'danger',
          }),
      },
    );
  }

  function saveFlavorPrice(flavorIdToSave: string, sizeToSave: string, raw: string) {
    const flavor = flavors.find((item) => item.id === flavorIdToSave);
    if (!flavor) return;
    const cents = reaisToCents(raw);
    if (cents == null) {
      pushToast({ title: 'Informe um preço válido.', tone: 'danger' });
      return;
    }
    const prices = Object.entries(flavor.pricesBySizeId).map(([id, priceCents]) => ({
      sizeId: id,
      priceCents: id === sizeToSave ? cents : priceCents,
    }));
    if (!prices.some((item) => item.sizeId === sizeToSave)) {
      prices.push({ sizeId: sizeToSave, priceCents: cents });
    }
    flavorMutation.mutate(
      {
        flavorId: flavorIdToSave,
        body: {
          name: flavor.name,
          description: flavor.description ?? undefined,
          available: flavor.available,
          sortOrder: flavor.sortOrder,
          prices,
        },
      },
      {
        onSuccess: () => pushToast({ title: `Preço de ${flavor.name} atualizado`, tone: 'success' }),
        onError: (error) =>
          pushToast({
            title: error instanceof ApiError && error.status === 403 ? 'Você não pode alterar preços.' : 'Não foi possível salvar o preço.',
            tone: 'danger',
          }),
      },
    );
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Cardápio de pizza"
      description="Tamanhos, sabores e cotação calculada no servidor. A cotação não confirma pedido."
    >
      <div className="grid gap-5">
        {menu.isLoading ? <Skeleton className="h-40" /> : null}
        {menu.isError ? (
          <EmptyState title="Não foi possível carregar a pizza" description="Tente de novo em instantes." />
        ) : null}
        {menu.data ? (
          <>
            <div className="grid gap-2">
              <h3 className="text-sm font-extrabold">Estratégia</h3>
              <p className="text-xs text-muted-foreground">
                Atual: {strategyLabel(menu.data.settings.strategy)}
              </p>
              <RadioGroup
                value={menu.data.settings.strategy}
                onValueChange={(value) => saveStrategy(value as CatalogPricingStrategy)}
                options={[
                  { value: 'HIGHEST', label: 'Sabor mais caro', description: 'HIGHEST no servidor.' },
                  { value: 'AVERAGE', label: 'Média dos sabores', description: 'AVERAGE no servidor.' },
                ]}
              />
            </div>
            <div className="grid gap-2">
              <h3 className="text-sm font-extrabold">Preços por tamanho</h3>
              {flavors.map((flavor) => (
                <div key={flavor.id} className="grid gap-2 rounded-[14px] border border-border p-3">
                  <p className="text-sm font-extrabold">{flavor.name}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {sizes.map((size) => {
                      const key = `${flavor.id}:${size.id}`;
                      const current = priceDrafts[key] ?? centsToReaisInput(flavor.pricesBySizeId[size.id] ?? 0);
                      return (
                        <FormField key={size.id} id={key} label={size.name}>
                          <div className="flex gap-2">
                            <Input
                              id={key}
                              value={current}
                              onChange={(event) =>
                                setPriceDrafts((draft) => ({ ...draft, [key]: event.target.value }))
                              }
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              loading={flavorMutation.isPending}
                              onClick={() => saveFlavorPrice(flavor.id, size.id, current)}
                            >
                              Salvar
                            </Button>
                          </div>
                        </FormField>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-3">
              <h3 className="text-sm font-extrabold">Cotação do servidor</h3>
              <FormField id="quote-size" label="Tamanho">
                <select
                  id="quote-size"
                  className="h-11 rounded-[12px] border border-input bg-card px-3 text-sm font-semibold"
                  value={selectedSize?.id ?? ''}
                  onChange={(event) => setSizeId(event.target.value)}
                >
                  {sizes.map((size) => (
                    <option key={size.id} value={size.id}>
                      {size.name} · até {size.maxFlavors} {size.maxFlavors === 1 ? 'sabor' : 'sabores'}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField id="quote-flavor" label="Sabor">
                <select
                  id="quote-flavor"
                  className="h-11 rounded-[12px] border border-input bg-card px-3 text-sm font-semibold"
                  value={selectedFlavor?.id ?? ''}
                  onChange={(event) => setFlavorId(event.target.value)}
                >
                  {flavors.map((flavor) => (
                    <option key={flavor.id} value={flavor.id}>
                      {flavor.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField id="quote-crust" label="Borda">
                <select
                  id="quote-crust"
                  className="h-11 rounded-[12px] border border-input bg-card px-3 text-sm font-semibold"
                  value={crustId}
                  onChange={(event) => setCrustId(event.target.value)}
                >
                  <option value="">Sem borda extra</option>
                  {crusts.map((crust) => (
                    <option key={crust.id} value={crust.id}>
                      {crust.name} · {formatBRL(crust.priceCents)}
                    </option>
                  ))}
                </select>
              </FormField>
              <div className="grid gap-2">
                <p className="text-sm font-bold">Adicionais</p>
                {extras.map((extra) => {
                  const selected = extraIds.includes(extra.id);
                  return (
                    <label key={extra.id} className="flex items-center justify-between gap-3 text-sm font-semibold">
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
              </div>
              {quote.isFetching ? <p className="text-xs font-bold text-muted-foreground">Cotando no servidor…</p> : null}
              {quote.data ? (
                <Alert title={`Total ${formatBRL(quote.data.totalCents)}`}>
                  {strategyLabel(quote.data.strategy)} · sabores {formatBRL(quote.data.flavorsCents)} · borda{' '}
                  {formatBRL(quote.data.crustCents)} · adicionais {formatBRL(quote.data.extrasCents)}. Cotação
                  informativa, sem reserva de preço.
                </Alert>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </Sheet>
  );
}
