export type PizzaSizeId = 'broto' | 'media' | 'grande' | 'familia';
export type PricingStrategy = 'highest' | 'proportional';

export interface PizzaSizeRule {
  id: PizzaSizeId;
  name: string;
  maxFlavors: number;
  slices: number;
  factorNumerator: number;
  factorDenominator: number;
}

export interface FlavorPortion {
  flavorId: string;
  numerator: number;
  denominator: number;
}

export interface PizzaPriceInput {
  size: PizzaSizeRule;
  flavorPrices: Record<string, number>;
  portions: FlavorPortion[];
  crustPriceCents: number;
  extrasCents: number;
  strategy: PricingStrategy;
}

export interface PizzaPriceResult {
  strategy: PricingStrategy;
  flavorsCents: number;
  crustCents: number;
  extrasCents: number;
  totalCents: number;
}

export const PIZZA_SIZES: PizzaSizeRule[] = [
  {
    id: 'broto',
    name: 'Broto',
    maxFlavors: 1,
    slices: 4,
    factorNumerator: 3,
    factorDenominator: 5,
  },
  {
    id: 'media',
    name: 'Média',
    maxFlavors: 2,
    slices: 6,
    factorNumerator: 4,
    factorDenominator: 5,
  },
  {
    id: 'grande',
    name: 'Grande',
    maxFlavors: 3,
    slices: 8,
    factorNumerator: 1,
    factorDenominator: 1,
  },
  {
    id: 'familia',
    name: 'Família',
    maxFlavors: 4,
    slices: 12,
    factorNumerator: 7,
    factorDenominator: 5,
  },
];

export function sizeById(id: PizzaSizeId): PizzaSizeRule {
  const size = PIZZA_SIZES.find((item) => item.id === id);
  if (!size) throw new Error('Tamanho de pizza não encontrado.');
  return size;
}

export function canAddFlavor(currentCount: number, size: PizzaSizeRule): boolean {
  return currentCount < size.maxFlavors;
}

export function equalPortions(flavorIds: string[]): FlavorPortion[] {
  const denominator = flavorIds.length;
  return flavorIds.map((flavorId) => ({ flavorId, numerator: 1, denominator }));
}

function scaleToSize(grandePriceCents: number, size: PizzaSizeRule): number {
  return Math.round((grandePriceCents * size.factorNumerator) / size.factorDenominator);
}

export function calculatePizzaPrice(input: PizzaPriceInput): PizzaPriceResult {
  if (input.portions.length === 0) {
    throw new Error('Selecione ao menos um sabor.');
  }
  if (input.portions.length > input.size.maxFlavors) {
    throw new Error('Quantidade de sabores acima do limite deste tamanho.');
  }

  const denominator = input.portions[0]?.denominator;
  if (!denominator || input.portions.some((portion) => portion.denominator !== denominator)) {
    throw new Error('As frações precisam usar o mesmo denominador.');
  }

  const numeratorSum = input.portions.reduce((total, portion) => total + portion.numerator, 0);
  if (numeratorSum !== denominator) {
    throw new Error('As frações da pizza precisam completar o disco.');
  }

  const scaled = input.portions.map((portion) => {
    const grandePrice = input.flavorPrices[portion.flavorId];
    if (grandePrice === undefined) throw new Error('Sabor não encontrado.');
    return { portion, priceCents: scaleToSize(grandePrice, input.size) };
  });

  const flavorsCents =
    input.strategy === 'highest'
      ? Math.max(...scaled.map((item) => item.priceCents))
      : Math.round(
          scaled.reduce((total, item) => total + item.priceCents * item.portion.numerator, 0) /
            denominator,
        );

  return {
    strategy: input.strategy,
    flavorsCents,
    crustCents: input.crustPriceCents,
    extrasCents: input.extrasCents,
    totalCents: flavorsCents + input.crustPriceCents + input.extrasCents,
  };
}
