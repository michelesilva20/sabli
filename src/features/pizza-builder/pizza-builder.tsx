import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { usePizzaOptionsQuery } from '@/shared/api/hooks';
import {
  calculatePizzaPrice,
  canAddFlavor,
  equalPortions,
  PIZZA_SIZES,
  sizeById,
  type PizzaSizeId,
  type PricingStrategy,
} from '@/shared/domain/pizza';
import { formatBRL } from '@/shared/domain/money';
import { demoSession } from '@/shared/demo/session';
import { Breadcrumb } from '@/design-system/components/navigation';
import { Button } from '@/design-system/components/button';
import { RadioGroup } from '@/design-system/components/choice';
import { Textarea } from '@/design-system/components/input';
import { Alert, Skeleton } from '@/design-system/components/feedback';
import { pushToast } from '@/design-system/components/toast';
import { cn } from '@/shared/utils/cn';

const STEP_LABELS = {
  tamanho: 'Tamanho',
  sabores: 'Sabores',
  fracoes: 'Frações',
  borda: 'Borda',
  adicionais: 'Adicionais',
  observacoes: 'Observações',
  revisao: 'Revisão',
} as const;

type StepId = keyof typeof STEP_LABELS;

export function PizzaBuilder({
  onDone,
  compact = false,
}: {
  onDone?: () => void;
  compact?: boolean;
}) {
  const options = usePizzaOptionsQuery();
  const navigate = useNavigate();
  const [sizeId, setSizeId] = useState<PizzaSizeId>('grande');
  const [flavorIds, setFlavorIds] = useState<string[]>([]);
  const [crustId, setCrustId] = useState('tradicional');
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [strategy, setStrategy] = useState<PricingStrategy>('highest');
  const [step, setStep] = useState<StepId>('tamanho');
  const [added, setAdded] = useState(false);
  const addingRef = useRef(false);

  const size = sizeById(sizeId);
  const steps = useMemo(() => {
    const base: StepId[] = ['tamanho', 'sabores'];
    if (flavorIds.length > 1) base.push('fracoes');
    base.push('borda', 'adicionais', 'observacoes', 'revisao');
    return base;
  }, [flavorIds.length]);

  const flavors = options.data?.flavors ?? [];
  const crusts = options.data?.crusts ?? [];
  const extras = options.data?.extras ?? [];
  const portions = equalPortions(flavorIds);
  const price =
    flavorIds.length === 0
      ? null
      : calculatePizzaPrice({
          size,
          flavorPrices: Object.fromEntries(
            flavors.map((flavor) => [flavor.id, flavor.grandePriceCents]),
          ),
          portions,
          crustPriceCents: crusts.find((crust) => crust.id === crustId)?.priceCents ?? 0,
          extrasCents: extras
            .filter((extra) => extraIds.includes(extra.id))
            .reduce((total, extra) => total + extra.priceCents, 0),
          strategy,
        });

  function go(offset: number) {
    const index = steps.indexOf(step);
    const next = steps[index + offset];
    if (next) setStep(next);
  }

  function toggleFlavor(id: string) {
    setFlavorIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (!canAddFlavor(current.length, size)) return current;
      return [...current, id];
    });
  }

  function addToOrder() {
    if (addingRef.current || added) return;
    if (!price) return;
    const crust = crusts.find((item) => item.id === crustId);
    if (!crust) return;
    const selectedFlavors = portions.flatMap((portion) => {
      const flavor = flavors.find((item) => item.id === portion.flavorId);
      if (!flavor) return [];
      return [
        {
          id: flavor.id,
          name: flavor.name,
          numerator: portion.numerator,
          denominator: portion.denominator,
        },
      ];
    });
    if (selectedFlavors.length !== portions.length) return;
    addingRef.current = true;
    const selectedExtras = extras.filter((extra) => extraIds.includes(extra.id));
    try {
      demoSession.addConfiguredItem({
        name: `Pizza ${size.name.toLowerCase()}`,
        unitPriceCents: price.totalCents,
        notes: notes.trim() || undefined,
        pizza: {
          sizeId: size.id,
          sizeName: size.name,
          flavors: selectedFlavors,
          crust: { id: crust.id, name: crust.name, priceCents: crust.priceCents },
          extras: selectedExtras.map((extra) => ({
            id: extra.id,
            name: extra.name,
            priceCents: extra.priceCents,
          })),
        },
      });
      setAdded(true);
      pushToast({
        title: 'Pizza adicionada ao pedido',
        description:
          'O valor usa a regra demonstrativa escolhida. A API Java definirá o preço final.',
        tone: 'success',
      });
    } catch {
      addingRef.current = false;
    }
  }

  if (options.isLoading) return <Skeleton className="h-80" />;

  if (added) {
    return (
      <div className="grid gap-4 rounded-[20px] bg-card p-6 shadow-card">
        <h2 className="text-2xl font-extrabold">Pizza no pedido</h2>
        <p className="text-sm text-muted-foreground">
          Ela entrou no rascunho local. Você pode revisar antes de enviar à cozinha.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => (onDone ? onDone() : navigate('/pdv'))}>Ver pedido</Button>
          <Button
            variant="outline"
            onClick={() => {
              addingRef.current = false;
              setAdded(false);
              setFlavorIds([]);
              setStep('tamanho');
            }}
          >
            Montar outra
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-5', !compact && 'lg:grid-cols-[220px_minmax(0,1fr)]')}>
      <ol
        className={cn('grid gap-2', compact && 'grid-flow-col overflow-x-auto')}
        aria-label="Etapas da pizza"
      >
        {steps.map((item, index) => (
          <li key={item}>
            <button
              type="button"
              onClick={() => setStep(item)}
              className={cn(
                'rounded-[12px] px-3 py-2 text-left text-sm font-bold',
                item === step ? 'bg-primary-soft text-primary-strong' : 'text-muted-foreground',
              )}
              aria-current={item === step ? 'step' : undefined}
            >
              {index + 1}. {STEP_LABELS[item]}
            </button>
          </li>
        ))}
      </ol>
      <section className="grid gap-4 rounded-[20px] bg-card p-5 shadow-card">
        {step === 'tamanho' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {PIZZA_SIZES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSizeId(item.id);
                  setFlavorIds((current) => current.slice(0, item.maxFlavors));
                }}
                className={cn(
                  'rounded-[16px] border p-4 text-left',
                  item.id === sizeId ? 'border-primary-action bg-primary-soft' : 'border-border',
                )}
                aria-pressed={item.id === sizeId}
              >
                <span className="block text-lg font-extrabold">{item.name}</span>
                <span className="text-sm text-muted-foreground">
                  {item.slices} fatias · até {item.maxFlavors}{' '}
                  {item.maxFlavors === 1 ? 'sabor' : 'sabores'}
                </span>
              </button>
            ))}
          </div>
        ) : null}
        {step === 'sabores' ? (
          <div className="grid gap-3">
            <p className="text-sm font-bold">
              {flavorIds.length} de {size.maxFlavors} sabores
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {flavors.map((flavor) => {
                const selected = flavorIds.includes(flavor.id);
                const blocked = !selected && !canAddFlavor(flavorIds.length, size);
                return (
                  <button
                    key={flavor.id}
                    type="button"
                    disabled={blocked}
                    onClick={() => toggleFlavor(flavor.id)}
                    className={cn(
                      'rounded-[16px] border p-4 text-left disabled:opacity-40',
                      selected ? 'border-primary-action bg-primary-soft' : 'border-border',
                    )}
                    aria-pressed={selected}
                  >
                    <span className="block font-extrabold">{flavor.name}</span>
                    <span className="text-xs text-muted-foreground">{flavor.description}</span>
                    <span className="tabular mt-2 block text-sm font-bold">
                      Grande {formatBRL(flavor.grandePriceCents)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        {step === 'fracoes' ? (
          <div className="grid gap-3">
            <Alert title="Divisão igual nesta demonstração">
              Cada sabor ocupa 1/{flavorIds.length} da pizza. Frações personalizadas serão
              configuradas pelo estabelecimento na API.
            </Alert>
            <ul className="grid gap-2">
              {portions.map((portion) => {
                const flavor = flavors.find((item) => item.id === portion.flavorId);
                return (
                  <li
                    key={portion.flavorId}
                    className="rounded-[12px] bg-muted px-3 py-2 text-sm font-bold"
                  >
                    {flavor?.name} · {portion.numerator}/{portion.denominator}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
        {step === 'borda' ? (
          <RadioGroup
            value={crustId}
            onValueChange={setCrustId}
            options={crusts.map((crust) => ({
              value: crust.id,
              label: crust.name,
              description: crust.priceCents === 0 ? 'Sem acréscimo' : formatBRL(crust.priceCents),
            }))}
          />
        ) : null}
        {step === 'adicionais' ? (
          <div className="grid gap-2">
            {extras.map((extra) => {
              const selected = extraIds.includes(extra.id);
              return (
                <button
                  key={extra.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    setExtraIds((current) =>
                      selected ? current.filter((id) => id !== extra.id) : [...current, extra.id],
                    )
                  }
                  className={cn(
                    'flex items-center justify-between rounded-[12px] border px-3 py-3 text-sm font-bold',
                    selected ? 'border-primary-action bg-primary-soft' : 'border-border',
                  )}
                >
                  {extra.name}
                  <span className="tabular">{formatBRL(extra.priceCents)}</span>
                </button>
              );
            })}
          </div>
        ) : null}
        {step === 'observacoes' ? (
          <label className="grid gap-2 text-sm font-bold">
            Observações para a cozinha
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={180}
            />
          </label>
        ) : null}
        {step === 'revisao' ? (
          <div className="grid gap-4">
            <Alert title="Precificação demonstrativa">
              O total abaixo é calculado no navegador. A cobrança oficial será responsabilidade da
              API Java.
            </Alert>
            <RadioGroup
              value={strategy}
              onValueChange={(value) => setStrategy(value as PricingStrategy)}
              options={[
                {
                  value: 'highest',
                  label: 'Maior valor',
                  description: 'Cobra o sabor mais caro, já ajustado ao tamanho.',
                },
                {
                  value: 'proportional',
                  label: 'Média proporcional',
                  description: 'Média das frações, em centavos inteiros.',
                },
              ]}
            />
            <dl className="grid gap-1 text-sm">
              <div className="flex justify-between">
                <dt>Sabores</dt>
                <dd className="tabular">{formatBRL(price?.flavorsCents ?? 0)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Borda</dt>
                <dd className="tabular">{formatBRL(price?.crustCents ?? 0)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Adicionais</dt>
                <dd className="tabular">{formatBRL(price?.extrasCents ?? 0)}</dd>
              </div>
              <div className="flex justify-between text-lg font-extrabold">
                <dt>Total</dt>
                <dd className="tabular">{formatBRL(price?.totalCents ?? 0)}</dd>
              </div>
            </dl>
          </div>
        ) : null}
        <div className="flex flex-wrap justify-between gap-2">
          <Button variant="outline" disabled={steps[0] === step} onClick={() => go(-1)}>
            Voltar
          </Button>
          {step === 'revisao' ? (
            <Button disabled={!price || added} onClick={addToOrder}>
              Adicionar ao pedido
            </Button>
          ) : (
            <Button disabled={step === 'sabores' && flavorIds.length === 0} onClick={() => go(1)}>
              Continuar
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

export function PizzaBuilderPage() {
  return (
    <div className="grid gap-4">
      <Breadcrumb items={[{ label: 'PDV', to: '/pdv' }, { label: 'Montar pizza' }]} />
      <div>
        <h1 className="text-2xl font-extrabold">Montar pizza</h1>
        <p className="text-sm text-muted-foreground">
          Escolha tamanho, sabores, borda e adicionais.
        </p>
      </div>
      <PizzaBuilder />
    </div>
  );
}
