import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { usePizzaOptionsQuery } from '@/shared/api/hooks';
import {
  calculatePizzaPrice,
  canAddFlavor,
  equalPortions,
  flavorPriceForSize,
  PIZZA_SIZES,
  sizeById,
  type PizzaSizeId,
  type PricingStrategy,
} from '@/shared/domain/pizza';
import { formatBRL } from '@/shared/domain/money';
import { demoSession } from '@/shared/demo/session';
import { PizzaBuildSummary } from '@/features/pizza-builder/pizza-build-summary';
import { Breadcrumb } from '@/design-system/components/navigation';
import { Button } from '@/design-system/components/button';
import { RadioGroup } from '@/design-system/components/choice';
import { QuantityInput } from '@/design-system/components/number-input';
import { Textarea } from '@/design-system/components/input';
import { Alert, Skeleton } from '@/design-system/components/feedback';
import { pushToast } from '@/design-system/components/toast';
import { cn } from '@/shared/utils/cn';

const STEPS = [
  { id: 'tamanho', label: 'Tamanho' },
  { id: 'sabores', label: 'Sabores' },
  { id: 'complementos', label: 'Borda e adicionais' },
  { id: 'observacoes', label: 'Observações' },
  { id: 'revisao', label: 'Revisão' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

export function PizzaBuilder({
  onDone,
  compact = false,
}: {
  onDone?: () => void;
  compact?: boolean;
}) {
  const options = usePizzaOptionsQuery();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [sizeId, setSizeId] = useState<PizzaSizeId>('grande');
  const [flavorIds, setFlavorIds] = useState<string[]>([]);
  const [crustId, setCrustId] = useState('tradicional');
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [strategy, setStrategy] = useState<PricingStrategy>('highest');
  const [quantity, setQuantity] = useState(1);
  const [step, setStep] = useState<StepId>('tamanho');
  const [added, setAdded] = useState(false);
  const [flavorHint, setFlavorHint] = useState<string | null>(null);
  const addingRef = useRef(false);

  const size = sizeById(sizeId);
  const flavors = options.data?.flavors ?? [];
  const crusts = options.data?.crusts ?? [];
  const extras = options.data?.extras ?? [];
  const selectedFlavors = flavors.filter((flavor) => flavorIds.includes(flavor.id));
  const selectedExtras = extras.filter((extra) => extraIds.includes(extra.id));
  const crust = crusts.find((item) => item.id === crustId);
  const overLimit = flavorIds.length > size.maxFlavors;
  const portions = equalPortions(flavorIds);
  const price =
    flavorIds.length === 0 || overLimit
      ? null
      : calculatePizzaPrice({
          size,
          flavorPrices: Object.fromEntries(
            flavors.map((flavor) => [flavor.id, flavor.grandePriceCents]),
          ),
          portions,
          crustPriceCents: crust?.priceCents ?? 0,
          extrasCents: selectedExtras.reduce((total, extra) => total + extra.priceCents, 0),
          strategy,
        });

  const stepIndex = STEPS.findIndex((item) => item.id === step);

  function isStepSatisfied(id: StepId) {
    if (id === 'sabores') return flavorIds.length > 0 && !overLimit;
    return true;
  }

  function canOpenStep(id: StepId) {
    const target = STEPS.findIndex((item) => item.id === id);
    return STEPS.slice(0, target).every((item) => isStepSatisfied(item.id));
  }

  function continueBlocked() {
    if (step === 'sabores' && flavorIds.length === 0) {
      return 'Selecione ao menos um sabor para continuar.';
    }
    if (step === 'sabores' && overLimit) {
      return `Remova sabores. ${size.name} aceita até ${size.maxFlavors}.`;
    }
    if (step === 'revisao' && !price) {
      return 'Selecione sabores válidos para calcular o preço.';
    }
    return null;
  }

  function go(offset: number) {
    const next = STEPS[stepIndex + offset];
    if (!next) return;
    if (offset > 0 && continueBlocked()) return;
    setStep(next.id);
  }

  function toggleFlavor(id: string) {
    setFlavorIds((current) => {
      if (current.includes(id)) {
        setFlavorHint(null);
        return current.filter((item) => item !== id);
      }
      if (!canAddFlavor(current.length, size)) {
        setFlavorHint(
          `${size.name} aceita até ${size.maxFlavors} ${size.maxFlavors === 1 ? 'sabor' : 'sabores'}.`,
        );
        return current;
      }
      setFlavorHint(null);
      return [...current, id];
    });
  }

  function addToOrder() {
    if (addingRef.current || added) return;
    if (!price) return;
    if (!crust) return;
    const composed = portions.flatMap((portion) => {
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
    if (composed.length !== portions.length) return;
    addingRef.current = true;
    try {
      demoSession.addConfiguredItem({
        name: `Pizza ${size.name.toLowerCase()}`,
        unitPriceCents: price.totalCents,
        quantity,
        notes: notes.trim() || undefined,
        pizza: {
          sizeId: size.id,
          sizeName: size.name,
          flavors: composed,
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
        title: quantity > 1 ? `${quantity} pizzas no pedido` : 'Pizza adicionada ao pedido',
        description:
          'O valor usa a regra demonstrativa escolhida. A API Java definirá o preço final.',
        tone: 'success',
      });
    } catch {
      addingRef.current = false;
    }
  }

  const summaryProps = {
    size,
    flavors: selectedFlavors,
    crust,
    extras: selectedExtras,
    quantity,
    unitPriceCents: price?.totalCents ?? null,
  };

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
              setExtraIds([]);
              setNotes('');
              setQuantity(1);
              setStep('tamanho');
            }}
          >
            Montar outra
          </Button>
        </div>
      </div>
    );
  }

  const blocked = continueBlocked();

  return (
    <div className={cn('grid gap-5', !compact && 'lg:grid-cols-[minmax(0,1fr)_280px]')}>
      {compact ? <PizzaBuildSummary {...summaryProps} compact /> : null}
      <div className={cn('grid gap-4', !compact && 'max-lg:pb-28')}>
        <div className="grid gap-2">
          <p className="text-xs font-extrabold text-muted-foreground">
            Etapa {stepIndex + 1} de {STEPS.length}
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div
              className="h-full rounded-full bg-primary-action transition-[width] duration-200 motion-reduce:transition-none"
              style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>
        <ol
          className={cn('grid gap-2', compact && 'grid-flow-col overflow-x-auto')}
          aria-label="Etapas da pizza"
        >
          {STEPS.map((item, index) => {
            const reachable = canOpenStep(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => reachable && setStep(item.id)}
                  disabled={!reachable}
                  className={cn(
                    'rounded-[12px] px-3 py-2 text-left text-sm font-bold whitespace-nowrap',
                    item.id === step
                      ? 'bg-primary-soft text-primary-strong'
                      : 'text-muted-foreground',
                    !reachable && 'opacity-40',
                  )}
                  aria-current={item.id === step ? 'step' : undefined}
                >
                  {index + 1}. {item.label}
                </button>
              </li>
            );
          })}
        </ol>
        <section className="grid gap-4 rounded-[20px] bg-card p-5 shadow-card">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
              className="grid gap-4"
            >
              {step === 'tamanho' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {PIZZA_SIZES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSizeId(item.id)}
                      className={cn(
                        'rounded-[16px] border p-4 text-left transition duration-150 motion-reduce:transition-none',
                        item.id === sizeId
                          ? 'border-primary-action bg-primary-soft'
                          : 'border-border hover:border-primary-action/40',
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
                  {overLimit ? (
                    <Alert title="Ajuste os sabores" tone="warning">
                      {size.name} aceita até {size.maxFlavors}{' '}
                      {size.maxFlavors === 1 ? 'sabor' : 'sabores'}. Remova o excedente para
                      continuar. Nada foi descartado automaticamente.
                    </Alert>
                  ) : null}
                </div>
              ) : null}
              {step === 'sabores' ? (
                <div className="grid gap-3">
                  <p className="text-sm font-bold">
                    {flavorIds.length} de {size.maxFlavors} sabores
                  </p>
                  {overLimit ? (
                    <Alert title="Limite deste tamanho" tone="warning">
                      {size.name} aceita até {size.maxFlavors} sabores. Remova o excedente para
                      continuar.
                    </Alert>
                  ) : null}
                  {flavorHint ? (
                    <p role="status" className="text-sm font-bold text-primary-strong">
                      {flavorHint}
                    </p>
                  ) : null}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {flavors.map((flavor) => {
                      const selected = flavorIds.includes(flavor.id);
                      return (
                        <button
                          key={flavor.id}
                          type="button"
                          onClick={() => toggleFlavor(flavor.id)}
                          className={cn(
                            'rounded-[16px] border p-4 text-left transition duration-150 motion-reduce:transition-none',
                            selected
                              ? 'border-primary-action bg-primary-soft'
                              : 'border-border hover:border-primary-action/40',
                          )}
                          aria-pressed={selected}
                        >
                          <span className="block font-extrabold">{flavor.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {flavor.description}
                          </span>
                          <span className="tabular mt-2 block text-sm font-bold">
                            {size.name}{' '}
                            {formatBRL(flavorPriceForSize(flavor.grandePriceCents, size))}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {flavorIds.length > 1 ? (
                    <Alert title="Divisão igual nesta demonstração">
                      Cada sabor ocupa 1/{flavorIds.length} da pizza. Frações personalizadas serão
                      configuradas pelo estabelecimento na API.
                    </Alert>
                  ) : null}
                </div>
              ) : null}
              {step === 'complementos' ? (
                <div className="grid gap-5">
                  <div className="grid gap-2">
                    <h2 className="text-sm font-extrabold">Borda</h2>
                    <RadioGroup
                      value={crustId}
                      onValueChange={setCrustId}
                      options={crusts.map((item) => ({
                        value: item.id,
                        label: item.name,
                        description:
                          item.priceCents === 0 ? 'Sem acréscimo' : formatBRL(item.priceCents),
                      }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <h2 className="text-sm font-extrabold">Adicionais</h2>
                    {extras.map((extra) => {
                      const selected = extraIds.includes(extra.id);
                      return (
                        <button
                          key={extra.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            setExtraIds((current) =>
                              selected
                                ? current.filter((id) => id !== extra.id)
                                : [...current, extra.id],
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
                    O total abaixo é calculado no navegador. A cobrança oficial será
                    responsabilidade da API Java.
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
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-extrabold">Quantidade</span>
                    <QuantityInput
                      value={quantity}
                      min={1}
                      max={99}
                      label="pizzas"
                      onChange={setQuantity}
                    />
                  </div>
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
                    <div className="flex justify-between">
                      <dt>Unitário</dt>
                      <dd className="tabular">{formatBRL(price?.totalCents ?? 0)}</dd>
                    </div>
                    <div className="flex justify-between text-lg font-extrabold">
                      <dt>Total</dt>
                      <dd className="tabular">{formatBRL((price?.totalCents ?? 0) * quantity)}</dd>
                    </div>
                  </dl>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
          <div className="flex flex-wrap justify-between gap-2">
            <Button variant="outline" disabled={stepIndex === 0} onClick={() => go(-1)}>
              Voltar
            </Button>
            {step === 'revisao' ? (
              <Button disabled={!price || added} onClick={addToOrder}>
                Adicionar ao pedido
              </Button>
            ) : (
              <Button
                disabled={Boolean(blocked)}
                title={blocked ?? undefined}
                onClick={() => go(1)}
              >
                Continuar
              </Button>
            )}
          </div>
          {blocked ? (
            <p role="status" className="text-sm font-bold text-primary-strong">
              {blocked}
            </p>
          ) : null}
        </section>
      </div>
      {!compact ? (
        <div className="hidden lg:block">
          <PizzaBuildSummary {...summaryProps} />
        </div>
      ) : null}
      {!compact ? (
        <div className="lg:hidden sticky bottom-0 z-20 -mx-4 border-t border-border bg-card/95 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:-mx-6 sm:px-6">
          <PizzaBuildSummary {...summaryProps} compact />
        </div>
      ) : null}
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
