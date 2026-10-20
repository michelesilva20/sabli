import { apiEst, apiEstBairro } from '@/test/api-fixtures';

export const catCentroId = '77777777-7777-4777-8777-777777777777';
export const prodCentroId = '88888888-8888-4888-8888-888888888888';
export const catBairroId = '99999999-9999-4999-8999-999999999999';
export const prodBairroId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const pizzaSizeId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
export const pizzaFlavorId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
export const pizzaCrustId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
export const pizzaExtraId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

export function categoryOf(establishmentId: string, name: string, id: string) {
  return {
    id,
    establishmentId,
    name,
    slug: name.toLowerCase(),
    sortOrder: 0,
    status: 'ACTIVE',
  };
}

export function productOf(
  establishmentId: string,
  categoryId: string,
  name: string,
  id: string,
  extra?: { available?: boolean; priceCents?: number; status?: 'ACTIVE' | 'INACTIVE' },
) {
  const priceCents = extra?.priceCents ?? 800;
  return {
    id,
    establishmentId,
    categoryId,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    description: '',
    kind: 'STANDARD',
    available: extra?.available ?? true,
    status: extra?.status ?? 'ACTIVE',
    sortOrder: 0,
    version: 0,
    priceCents,
    variants: [
      {
        id: '12121212-1212-4121-8121-121212121211',
        productId: id,
        name: 'Padrão',
        priceCents,
        available: extra?.available ?? true,
        status: 'ACTIVE',
        sortOrder: 0,
      },
    ],
  };
}

export const centroCategory = categoryOf(apiEst.id, 'Bebidas', catCentroId);
export const centroProduct = productOf(apiEst.id, catCentroId, 'Refrigerante', prodCentroId);
export const bairroCategory = categoryOf(apiEstBairro.id, 'Sucos', catBairroId);
export const bairroProduct = productOf(apiEstBairro.id, catBairroId, 'Suco de laranja', prodBairroId, {
  priceCents: 1200,
});
export const unavailableProduct = productOf(
  apiEst.id,
  catCentroId,
  'Água com gás',
  '13131313-1313-4131-8131-131313131313',
  { available: false, priceCents: 500 },
);

export const pizzaMenu = {
  settings: { establishmentId: apiEst.id, strategy: 'HIGHEST', version: 0 },
  sizes: [
    {
      id: pizzaSizeId,
      code: 'grande',
      name: 'Grande',
      maxFlavors: 3,
      slices: 8,
      priceFactorNumerator: 1,
      priceFactorDenominator: 1,
      available: true,
      status: 'ACTIVE',
      sortOrder: 0,
    },
  ],
  flavors: [
    {
      id: pizzaFlavorId,
      name: 'Calabresa API',
      slug: 'calabresa-api',
      description: '',
      available: true,
      status: 'ACTIVE',
      sortOrder: 0,
      pricesBySizeId: { [pizzaSizeId]: 5800 },
    },
  ],
  crusts: [
    {
      id: pizzaCrustId,
      name: 'Catupiry',
      slug: 'catupiry',
      priceCents: 800,
      available: true,
      status: 'ACTIVE',
      sortOrder: 0,
    },
  ],
  extras: [
    {
      id: pizzaExtraId,
      name: 'Bacon',
      slug: 'bacon',
      priceCents: 600,
      available: true,
      status: 'ACTIVE',
      sortOrder: 0,
    },
  ],
};

export const pizzaQuote = {
  size: { id: pizzaSizeId, name: 'Grande', priceCents: null },
  flavors: [{ id: pizzaFlavorId, name: 'Calabresa API', priceCents: null }],
  crust: { id: pizzaCrustId, name: 'Catupiry', priceCents: 800 },
  extras: [{ id: pizzaExtraId, name: 'Bacon', priceCents: 600 }],
  quantity: 1,
  strategy: 'HIGHEST',
  flavorsCents: 5800,
  crustCents: 800,
  extrasCents: 600,
  unitCents: 7200,
  totalCents: 7200,
  breakdown: [{ code: 'FLAVORS', label: 'Sabores', cents: 5800 }],
};
