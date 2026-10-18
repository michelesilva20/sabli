import { cleanup, render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';
import { AppProviders } from '@/app/providers/app-providers';
import { ChecksPage } from '@/features/orders/checks-page';
import { OrdersPage } from '@/features/orders/orders-page';
import { KitchenPage } from '@/features/kitchen/kitchen-page';
import { demoSession, getDemoState } from '@/shared/demo/session';
import { formatBRL } from '@/shared/domain/money';
import { orderDiscountCents, orderSubtotalCents, orderTotalCents } from '@/shared/domain/order';
import { calculatePizzaPrice, equalPortions, sizeById } from '@/shared/domain/pizza';
import { products } from '@/shared/mocks/fixtures';
import type { PizzaComposition } from '@/shared/types/domain';

const catupiry = { id: 'catupiry', name: 'Catupiry', priceCents: 800 };
const tradicional = { id: 'tradicional', name: 'Tradicional', priceCents: 0 };
const bacon = { id: 'bacon', name: 'Bacon', priceCents: 500 };

function pizzaPrice(crustCents: number, extrasCents: number) {
  return calculatePizzaPrice({
    size: sizeById('grande'),
    flavorPrices: { calabresa: 5890, mucarela: 5490 },
    portions: equalPortions(['calabresa', 'mucarela']),
    crustPriceCents: crustCents,
    extrasCents,
    strategy: 'highest',
  });
}

function addHalfPizza(
  crust: PizzaComposition['crust'],
  extras: PizzaComposition['extras'],
  notes?: string,
) {
  const price = pizzaPrice(
    crust.priceCents,
    extras.reduce((total, extra) => total + extra.priceCents, 0),
  );
  demoSession.addConfiguredItem({
    name: 'Pizza grande',
    unitPriceCents: price.totalCents,
    notes,
    pizza: {
      sizeId: 'grande',
      sizeName: 'Grande',
      flavors: [
        { id: 'calabresa', name: 'Calabresa', numerator: 1, denominator: 2 },
        { id: 'mucarela', name: 'Muçarela', numerator: 1, denominator: 2 },
      ],
      crust,
      extras,
    },
  });
  return price;
}

function renderPage(ui: ReactElement) {
  return render(
    <AppProviders>
      <MemoryRouter>{ui}</MemoryRouter>
    </AppProviders>,
  );
}

async function clickText(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  const matches = await screen.findAllByText(name);
  await user.click(matches[0]);
}

describe('integridade do pedido', () => {
  it('leva a pizza completa do rascunho ao KDS', async () => {
    const user = userEvent.setup();
    const price = addHalfPizza(catupiry, [bacon], 'sem cebola');
    const draft = getDemoState().lines[0];
    expect(draft.pizza?.flavors.map((flavor) => flavor.name)).toEqual(['Calabresa', 'Muçarela']);
    expect(draft.pizza?.crust).toEqual(catupiry);
    expect(draft.pizza?.extras).toEqual([bacon]);
    expect(draft.notes).toBe('sem cebola');
    expect(draft.unitPriceCents).toBe(price.totalCents);

    demoSession.setQuantity(draft.id, 2);
    demoSession.selectTable('t01');
    const sent = demoSession.sendToKitchen();
    const gross = price.totalCents * 2;
    expect(sent?.items[0]).toMatchObject({
      lineId: draft.id,
      quantity: 2,
      totalCents: gross,
      notes: 'sem cebola',
    });
    expect(sent?.subtotalCents).toBe(gross);
    expect(sent?.discountCents).toBe(0);
    expect(sent?.totalCents).toBe(gross);
    expect(getDemoState().tickets[0].items[0]).toMatchObject({
      lineId: draft.id,
      pizza: { crust: catupiry, extras: [bacon] },
      notes: 'sem cebola',
    });

    renderPage(<OrdersPage />);
    await clickText(user, /1\/2 Calabresa, 1\/2 Muçarela/i);
    const detail = await screen.findByRole('dialog');
    expect(within(detail).getByText('1/2 Calabresa')).toBeInTheDocument();
    expect(within(detail).getByText('1/2 Muçarela')).toBeInTheDocument();
    expect(within(detail).getByText('Borda de Catupiry')).toBeInTheDocument();
    expect(within(detail).getByText('Adicional: Bacon')).toBeInTheDocument();
    expect(within(detail).getByText('sem cebola')).toBeInTheDocument();
    expect(within(detail).getByText('Subtotal')).toBeInTheDocument();
    expect(within(detail).getAllByText(formatBRL(gross)).length).toBeGreaterThan(0);

    cleanup();
    renderPage(<ChecksPage />);
    await user.click(await screen.findByRole('button', { name: /mesa 01/i }));
    const check = await screen.findByRole('dialog', { name: /mesa 01/i });
    expect(within(check).getByText('1/2 Calabresa')).toBeInTheDocument();
    expect(within(check).getByText('Borda de Catupiry')).toBeInTheDocument();
    expect(within(check).getAllByText(formatBRL(gross)).length).toBeGreaterThan(0);

    cleanup();
    renderPage(<KitchenPage />);
    expect(screen.getByText('Borda de Catupiry')).toBeInTheDocument();
    expect(screen.getByText('Adicional: Bacon')).toBeInTheDocument();
    expect(screen.getByText('sem cebola')).toBeInTheDocument();
  });

  it('mantém a borda gratuita na composição', () => {
    addHalfPizza(tradicional, []);
    const line = getDemoState().lines[0];
    expect(line.pizza?.crust).toEqual(tradicional);
    demoSession.sendToKitchen();
    expect(getDemoState().tickets[0].items[0].pizza?.crust.name).toBe('Tradicional');
    expect(getDemoState().localOrders[0].items[0].pizza?.crust.priceCents).toBe(0);
  });

  it('aceita uma bebida sem composição de pizza', () => {
    const cola = products.find((product) => product.id === 'dr_cola');
    expect(cola).toBeDefined();
    demoSession.addProduct(cola!);
    const sent = demoSession.sendToKitchen();
    expect(sent?.items[0]).toMatchObject({
      productId: 'dr_cola',
      name: 'Coca-Cola 2L',
      quantity: 1,
      totalCents: 1600,
    });
    expect(sent?.items[0].pizza).toBeUndefined();
    expect(getDemoState().tickets[0].items[0].pizza).toBeUndefined();
  });

  it('reconcilia o desconto ilustrativo sem duplicar', async () => {
    const user = userEvent.setup();
    const cola = products.find((product) => product.id === 'dr_cola')!;
    demoSession.addProduct(cola);
    demoSession.setQuantity(getDemoState().lines[0].id, 2);
    demoSession.setDiscount(true);
    const lines = getDemoState().lines;
    const subtotal = orderSubtotalCents(lines);
    const discount = orderDiscountCents(subtotal, 10);
    const total = orderTotalCents(subtotal, discount);
    expect(subtotal).toBe(3200);
    expect(discount).toBe(320);
    expect(total).toBe(2880);

    const sent = demoSession.sendToKitchen();
    expect(sent?.items[0].totalCents).toBe(3200);
    expect(sent?.subtotalCents).toBe(3200);
    expect(sent?.discountCents).toBe(320);
    expect(sent?.totalCents).toBe(2880);
    expect(sent!.items.reduce((sum, item) => sum + item.totalCents, 0) - sent!.discountCents).toBe(
      sent!.totalCents,
    );

    renderPage(<OrdersPage />);
    await clickText(user, /2× Coca-Cola 2L/i);
    const detail = await screen.findByRole('dialog');
    expect(within(detail).getAllByText('Desconto ilustrativo de 10%')).toHaveLength(1);
    expect(within(detail).getByText(`− ${formatBRL(320)}`)).toBeInTheDocument();
    expect(within(detail).getAllByText(formatBRL(2880))).toHaveLength(1);
    expect(within(detail).getAllByText(formatBRL(3200)).length).toBeGreaterThan(0);
  });

  it('acumula dois pedidos na mesa sem somar o saldo duas vezes', async () => {
    const user = userEvent.setup();
    const before = getDemoState().tables.find((table) => table.id === 't03')!.billCents;
    demoSession.selectTable('t03');
    demoSession.addProduct(products.find((product) => product.id === 'dr_cola')!);
    const first = demoSession.sendToKitchen()!;
    demoSession.addProduct(products.find((product) => product.id === 'dr_suco')!);
    const second = demoSession.sendToKitchen()!;
    const after = getDemoState().tables.find((table) => table.id === 't03')!.billCents;
    expect(before).toBe(8950);
    expect(after).toBe(before + first.totalCents + second.totalCents);
    expect(getDemoState().localOrders).toHaveLength(2);

    renderPage(<ChecksPage />);
    await user.click(await screen.findByRole('button', { name: /mesa 03/i }));
    const check = await screen.findByRole('dialog', { name: /mesa 03/i });
    expect(within(check).getByText(`Pedido #${first.number}`)).toBeInTheDocument();
    expect(within(check).getByText(`Pedido #${second.number}`)).toBeInTheDocument();
    expect(within(check).getByText(formatBRL(after))).toBeInTheDocument();
    expect(within(check).getAllByText(formatBRL(after))).toHaveLength(1);
  });

  it('distingue linhas de mesmo nome por id', () => {
    addHalfPizza(catupiry, [bacon], 'sem cebola');
    demoSession.addConfiguredItem({
      name: 'Pizza grande',
      unitPriceCents: 5490,
      pizza: {
        sizeId: 'grande',
        sizeName: 'Grande',
        flavors: [{ id: 'mucarela', name: 'Muçarela', numerator: 1, denominator: 1 }],
        crust: tradicional,
        extras: [],
      },
    });
    const [first, second] = getDemoState().lines;
    expect(first.id).not.toBe(second.id);
    expect(first.name).toBe(second.name);
    const sent = demoSession.sendToKitchen();
    expect(sent?.items.map((item) => item.lineId)).toEqual([first.id, second.id]);
    expect(getDemoState().tickets[0].items.map((item) => item.lineId)).toEqual([
      first.id,
      second.id,
    ]);
  });

  it('continua exibindo pedidos e tickets de exemplo', async () => {
    renderPage(<OrdersPage />);
    expect((await screen.findAllByText(/Pizza grande quatro queijos/)).length).toBeGreaterThan(0);
    cleanup();
    renderPage(<KitchenPage />);
    expect(screen.getAllByText('Calabresa + muçarela · borda catupiry').length).toBeGreaterThan(0);
  });
});
