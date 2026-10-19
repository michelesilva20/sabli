import { useMutation, useQuery } from '@tanstack/react-query';
import {
  changePizzaStrategy,
  changeProductAvailability,
  changeProductStatus,
  createCategory,
  createProduct,
  getPizzaMenu,
  listCategories,
  listProducts,
  quotePizza,
  updateFlavor,
  updateProduct,
  type CatalogPricingStrategy,
  type ProductListQuery,
} from '@/shared/api/catalog';
import { appQueryClient } from '@/shared/api/query-client';
import { useAuthSession } from '@/shared/auth/session';

export function catalogKeys(establishmentId: string) {
  return {
    all: ['catalog', establishmentId] as const,
    categories: ['catalog', establishmentId, 'categories'] as const,
    products: (filters: ProductListQuery) => ['catalog', establishmentId, 'products', filters] as const,
    pizza: ['catalog', establishmentId, 'pizza'] as const,
    quote: (payload: unknown) => ['catalog', establishmentId, 'quote', payload] as const,
  };
}

function useEstablishmentId() {
  return useAuthSession().context?.establishment?.id;
}

export function useCatalogCategoriesQuery(includeInactive = false) {
  const establishmentId = useEstablishmentId();
  return useQuery({
    queryKey: [...catalogKeys(establishmentId ?? '').categories, includeInactive],
    queryFn: () => listCategories(establishmentId!, includeInactive),
    enabled: Boolean(establishmentId),
  });
}

export function useCatalogProductsQuery(filters: ProductListQuery) {
  const establishmentId = useEstablishmentId();
  return useQuery({
    queryKey: catalogKeys(establishmentId ?? '').products(filters),
    queryFn: () => listProducts(establishmentId!, filters),
    enabled: Boolean(establishmentId),
  });
}

export function usePizzaMenuQuery(enabled = true) {
  const establishmentId = useEstablishmentId();
  return useQuery({
    queryKey: catalogKeys(establishmentId ?? '').pizza,
    queryFn: () => getPizzaMenu(establishmentId!),
    enabled: Boolean(establishmentId) && enabled,
  });
}

export function usePizzaQuoteQuery(payload: {
  sizeId?: string;
  flavorIds: string[];
  crustId?: string;
  extraIds?: string[];
  quantity: number;
}) {
  const establishmentId = useEstablishmentId();
  const ready = Boolean(establishmentId && payload.sizeId && payload.flavorIds.length > 0);
  return useQuery({
    queryKey: catalogKeys(establishmentId ?? '').quote(payload),
    queryFn: () =>
      quotePizza(establishmentId!, {
        sizeId: payload.sizeId!,
        flavorIds: payload.flavorIds,
        crustId: payload.crustId,
        extraIds: payload.extraIds,
        quantity: payload.quantity,
      }),
    enabled: ready,
  });
}

function invalidateCatalog(establishmentId: string) {
  return appQueryClient.invalidateQueries({ queryKey: catalogKeys(establishmentId).all });
}

export function useCreateCategoryMutation() {
  const establishmentId = useEstablishmentId();
  return useMutation({
    mutationFn: (name: string) => createCategory(establishmentId!, { name }),
    onSuccess: () => establishmentId && invalidateCatalog(establishmentId),
  });
}

export function useCreateProductMutation() {
  const establishmentId = useEstablishmentId();
  return useMutation({
    mutationFn: (body: Parameters<typeof createProduct>[1]) => createProduct(establishmentId!, body),
    onSuccess: () => establishmentId && invalidateCatalog(establishmentId),
  });
}

export function useUpdateProductMutation() {
  const establishmentId = useEstablishmentId();
  return useMutation({
    mutationFn: (input: { productId: string; body: Parameters<typeof updateProduct>[2] }) =>
      updateProduct(establishmentId!, input.productId, input.body),
    onSuccess: () => establishmentId && invalidateCatalog(establishmentId),
  });
}

export function useProductAvailabilityMutation() {
  const establishmentId = useEstablishmentId();
  return useMutation({
    mutationFn: (input: { productId: string; available: boolean; version: number }) =>
      changeProductAvailability(establishmentId!, input.productId, {
        available: input.available,
        version: input.version,
      }),
    onSuccess: () => establishmentId && invalidateCatalog(establishmentId),
  });
}

export function useProductStatusMutation() {
  const establishmentId = useEstablishmentId();
  return useMutation({
    mutationFn: (input: { productId: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      changeProductStatus(establishmentId!, input.productId, input.status),
    onSuccess: () => establishmentId && invalidateCatalog(establishmentId),
  });
}

export function usePizzaStrategyMutation() {
  const establishmentId = useEstablishmentId();
  return useMutation({
    mutationFn: (input: { strategy: CatalogPricingStrategy; version: number }) =>
      changePizzaStrategy(establishmentId!, input),
    onSuccess: () => establishmentId && invalidateCatalog(establishmentId),
  });
}

export function useUpdateFlavorMutation() {
  const establishmentId = useEstablishmentId();
  return useMutation({
    mutationFn: (input: {
      flavorId: string;
      body: Parameters<typeof updateFlavor>[2];
    }) => updateFlavor(establishmentId!, input.flavorId, input.body),
    onSuccess: () => establishmentId && invalidateCatalog(establishmentId),
  });
}
