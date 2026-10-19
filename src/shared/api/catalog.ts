import { z } from 'zod';
import { apiRequest } from '@/shared/api/http-client';
import type { Product } from '@/shared/types/domain';

const catalogStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
const productKindSchema = z.enum(['STANDARD', 'PIZZA']);
const pricingStrategySchema = z.enum(['HIGHEST', 'AVERAGE']);

export const categoryResponseSchema = z.object({
  id: z.string().uuid(),
  establishmentId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  sortOrder: z.number().int(),
  status: catalogStatusSchema,
});

export const variantResponseSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  name: z.string(),
  priceCents: z.number().int(),
  available: z.boolean(),
  status: catalogStatusSchema,
  sortOrder: z.number().int(),
});

export const productResponseSchema = z.object({
  id: z.string().uuid(),
  establishmentId: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().optional(),
  kind: productKindSchema,
  available: z.boolean(),
  status: catalogStatusSchema,
  sortOrder: z.number().int(),
  version: z.number().int(),
  priceCents: z.number().int().nullable().optional(),
  variants: z.array(variantResponseSchema),
});

export const productPageSchema = z.object({
  items: z.array(productResponseSchema),
  page: z.number().int(),
  size: z.number().int(),
  total: z.number().int(),
});

export const sizeResponseSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  maxFlavors: z.number().int(),
  slices: z.number().int(),
  priceFactorNumerator: z.number().int(),
  priceFactorDenominator: z.number().int(),
  available: z.boolean(),
  status: catalogStatusSchema,
  sortOrder: z.number().int(),
});

export const flavorResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().optional(),
  available: z.boolean(),
  status: catalogStatusSchema,
  sortOrder: z.number().int(),
  pricesBySizeId: z.record(z.string(), z.number().int()),
});

export const pricedOptionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  priceCents: z.number().int(),
  available: z.boolean(),
  status: catalogStatusSchema,
  sortOrder: z.number().int(),
});

export const pizzaSettingsSchema = z.object({
  establishmentId: z.string().uuid(),
  strategy: pricingStrategySchema,
  version: z.number().int(),
});

export const pizzaMenuSchema = z.object({
  settings: pizzaSettingsSchema,
  sizes: z.array(sizeResponseSchema),
  flavors: z.array(flavorResponseSchema),
  crusts: z.array(pricedOptionSchema),
  extras: z.array(pricedOptionSchema),
});

const quoteComponentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  priceCents: z.number().int().nullable().optional(),
});

export const quoteResponseSchema = z.object({
  size: quoteComponentSchema,
  flavors: z.array(quoteComponentSchema),
  crust: quoteComponentSchema.nullable().optional(),
  extras: z.array(quoteComponentSchema),
  quantity: z.number().int(),
  strategy: pricingStrategySchema,
  flavorsCents: z.number().int(),
  crustCents: z.number().int(),
  extrasCents: z.number().int(),
  unitCents: z.number().int(),
  totalCents: z.number().int(),
  breakdown: z.array(
    z.object({
      code: z.string(),
      label: z.string(),
      cents: z.number().int(),
    }),
  ),
});

export type CategoryResponse = z.infer<typeof categoryResponseSchema>;
export type ProductResponse = z.infer<typeof productResponseSchema>;
export type ProductPage = z.infer<typeof productPageSchema>;
export type PizzaMenu = z.infer<typeof pizzaMenuSchema>;
export type QuoteResponse = z.infer<typeof quoteResponseSchema>;
export type CatalogPricingStrategy = z.infer<typeof pricingStrategySchema>;
export type SizeResponse = z.infer<typeof sizeResponseSchema>;
export type FlavorResponse = z.infer<typeof flavorResponseSchema>;
export type PricedOption = z.infer<typeof pricedOptionSchema>;

export interface ProductListQuery {
  categoryId?: string;
  available?: boolean;
  q?: string;
  includeInactive?: boolean;
  page?: number;
  size?: number;
}

function catalogPath(establishmentId: string, suffix: string): string {
  return `/establishments/${establishmentId}/catalog${suffix}`;
}

export function listCategories(establishmentId: string, includeInactive = false) {
  return apiRequest(z.array(categoryResponseSchema), {
    path: catalogPath(establishmentId, '/categories'),
    query: { includeInactive },
  });
}

export function createCategory(establishmentId: string, body: { name: string; sortOrder?: number }) {
  return apiRequest(categoryResponseSchema, {
    path: catalogPath(establishmentId, '/categories'),
    method: 'POST',
    body,
  });
}

export function listProducts(establishmentId: string, query: ProductListQuery = {}) {
  return apiRequest(productPageSchema, {
    path: catalogPath(establishmentId, '/products'),
    query: {
      categoryId: query.categoryId,
      available: query.available,
      q: query.q,
      includeInactive: query.includeInactive,
      page: query.page ?? 0,
      size: query.size ?? 20,
    },
  });
}

export function createProduct(
  establishmentId: string,
  body: {
    categoryId: string;
    name: string;
    description?: string;
    kind?: 'STANDARD' | 'PIZZA';
    available?: boolean;
    priceCents?: number;
    variants?: { name: string; priceCents: number; available?: boolean }[];
  },
) {
  return apiRequest(productResponseSchema, {
    path: catalogPath(establishmentId, '/products'),
    method: 'POST',
    body,
  });
}

export function updateProduct(
  establishmentId: string,
  productId: string,
  body: {
    categoryId: string;
    name: string;
    description?: string;
    kind?: 'STANDARD' | 'PIZZA';
    available?: boolean;
    priceCents?: number;
    variants?: { name: string; priceCents: number; available?: boolean }[];
    version?: number;
  },
) {
  return apiRequest(productResponseSchema, {
    path: catalogPath(establishmentId, `/products/${productId}`),
    method: 'PATCH',
    body,
  });
}

export function changeProductAvailability(
  establishmentId: string,
  productId: string,
  body: { available: boolean; version: number },
) {
  return apiRequest(productResponseSchema, {
    path: catalogPath(establishmentId, `/products/${productId}/availability`),
    method: 'PATCH',
    body,
  });
}

export function changeProductStatus(
  establishmentId: string,
  productId: string,
  status: 'ACTIVE' | 'INACTIVE',
) {
  return apiRequest(productResponseSchema, {
    path: catalogPath(establishmentId, `/products/${productId}/status`),
    method: 'PATCH',
    body: { status },
  });
}

export function getPizzaMenu(establishmentId: string) {
  return apiRequest(pizzaMenuSchema, {
    path: catalogPath(establishmentId, '/pizza'),
  });
}

export function changePizzaStrategy(
  establishmentId: string,
  body: { strategy: CatalogPricingStrategy; version: number },
) {
  return apiRequest(pizzaSettingsSchema, {
    path: catalogPath(establishmentId, '/pizza/settings'),
    method: 'PATCH',
    body,
  });
}

export function updateFlavor(
  establishmentId: string,
  flavorId: string,
  body: {
    name: string;
    description?: string;
    available?: boolean;
    sortOrder?: number;
    prices: { sizeId: string; priceCents: number }[];
  },
) {
  return apiRequest(flavorResponseSchema, {
    path: catalogPath(establishmentId, `/pizza/flavors/${flavorId}`),
    method: 'PATCH',
    body,
  });
}

export function quotePizza(
  establishmentId: string,
  body: {
    sizeId: string;
    flavorIds: string[];
    crustId?: string;
    extraIds?: string[];
    quantity: number;
  },
) {
  return apiRequest(quoteResponseSchema, {
    path: catalogPath(establishmentId, '/pizza/quotes'),
    method: 'POST',
    body,
  });
}

export function toCatalogCard(product: ProductResponse): Product {
  return {
    id: product.id,
    categoryId: product.categoryId,
    name: product.name,
    description: product.description ?? '',
    priceCents: product.priceCents ?? 0,
    available: product.available && product.status === 'ACTIVE',
    art: product.kind === 'PIZZA' ? 'pizza' : 'starter',
    accent: '',
    image: '',
  };
}

export function reaisToCents(raw: string): number | null {
  const normalized = raw.trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  if (!normalized) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export function centsToReaisInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

export function strategyLabel(strategy: CatalogPricingStrategy): string {
  return strategy === 'AVERAGE' ? 'Média dos sabores' : 'Sabor mais caro';
}
