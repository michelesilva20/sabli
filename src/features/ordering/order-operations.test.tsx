import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { AppProviders } from '@/app/providers/app-providers';
import { mockDataSource } from '@/shared/api/data-source';
import { OrdersPage } from '@/features/orders/orders-page';
import { OrderSummary } from '@/features/ordering/order-summary';
import { PizzaBuilder } from '@/features/pizza-builder/pizza-builder';
import { PosPage } from '@/features/pos/pos-page';
import { demoSession, getDemoState, selectOrderTotals } from '@/shared/demo/session';
import { formatBRL } from '@/shared/domain/money';
import { products } from '@/shared/mocks/fixtures';
import type { PizzaComposition } from '@/shared/types/domain';

const cola = products.find((product) => product.id === 'dr_cola')!;
const garlic = products.find((product) => product.id === 'en_pao')!;
const tradicional = { id: 'tradicional', name: 'Tradicional', priceCents: 0 };

function pizzaComposition(): PizzaComposition {
  return {
    sizeId: 'grande',
    sizeName: 'Grande',
    flavors: [{ id: 'calabresa', name: 'Calabresa', numerator: 1, denominator: 1 }],
    crust: tradicional,
    extras: [],
  };
}

function addPizza(notes?: string) {
  demoSession.addConfiguredItem({
    name: 'Pizza grande',
    unitPriceCents: 5890,
    notes,
    pizza: pizzaComposition(),
  });
}

function renderPage(ui: ReactElement) {
  return render(
    <AppProviders>
      <MemoryRouter>{ui}</MemoryRouter>
    </AppProviders>,
  );
}

describe('confiabilidade operacional', () => {
  it('remove o produto com quantidade 1 e recalcula o total', async () => {
    const user = userEvent.setup();
    demoSession.addProduct(cola);
    demoSession.setDiscount(true);
    expect(selectOrderTotals(getDemoState())).toMatchObject({
      subtotalCents: 1600,
      discountCents: 160,
      totalCents: 1440,
    });
    renderPage(<OrderSummary />);
    expect(screen.getAllByText(formatBRL(1600)).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Remover Coca-Cola 2L' }));
    expect(getDemoState().lines).toHaveLength(0);
    expect(screen.getByText('Nenhum item adicionado.')).toBeInTheDocument();
    expect(selectOrderTotals(getDemoState())).toMatchObject({
      subtotalCents: 0,
      discountCents: 0,
      totalCents: 0,
    });
  });

  it('diminui a quantidade sem remover a linha', async () => {
    const user = userEvent.setup();
    demoSession.addProduct(cola);
    demoSession.setQuantity(getDemoState().lines[0].id, 3);
    renderPage(<OrderSummary />);
    await user.click(screen.getByRole('button', { name: /diminuir coca-cola/i }));
    expect(getDemoState().lines[0].quantity).toBe(2);
    expect(selectOrderTotals(getDemoState()).subtotalCents).toBe(3200);
    await user.click(screen.getByRole('button', { name: /diminuir coca-cola/i }));
    expect(getDemoState().lines).toHaveLength(1);
    expect(getDemoState().lines[0].quantity).toBe(1);
    expect(screen.getByRole('button', { name: 'Remover Coca-Cola 2L' })).toBeInTheDocument();
  });

  it('remove só a pizza e preserva a bebida', async () => {
    const user = userEvent.setup();
    addPizza();
    demoSession.addProduct(cola);
    renderPage(<OrderSummary />);
    await user.click(screen.getByRole('button', { name: 'Remover Pizza grande' }));
    expect(getDemoState().lines).toHaveLength(1);
    expect(getDemoState().lines[0].productId).toBe('dr_cola');
    expect(getDemoState().lines[0].pizza).toBeUndefined();
  });

  it('ignora o segundo clique imediato no montador', async () => {
    const user = userEvent.setup();
    renderPage(<PizzaBuilder />);
    await user.click(await screen.findByRole('button', { name: '2. Sabores' }));
    await user.click(await screen.findByRole('button', { name: /^Calabresa/ }));
    await user.click(screen.getByRole('button', { name: /revisão/i }));
    const add = await screen.findByRole('button', { name: 'Adicionar ao pedido' });
    fireEvent.click(add);
    fireEvent.click(add);
    expect(getDemoState().lines).toHaveLength(1);
    expect(await screen.findByRole('heading', { name: 'Pizza no pedido' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Montar outra' }));
    expect(screen.getByRole('button', { name: '1. Tamanho' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adicionar ao pedido' })).not.toBeInTheDocument();
  });

  it('reflete cada etapa do KDS no pedido com um item', async () => {
    const user = userEvent.setup();
    addPizza();
    const sent = demoSession.sendToKitchen()!;
    expect(sent.status).toBe('aberto');
    const ticket = getDemoState().tickets[0];
    expect(ticket.items[0].lineId).toBe(sent.items[0].lineId);

    renderPage(<OrdersPage />);
    expect((await screen.findAllByText('Aguardando')).length).toBeGreaterThan(0);

    expect(demoSession.advanceTicket(ticket.id)).toBe(true);
    expect(getDemoState().localOrders[0].status).toBe('em preparo');
    expect(getDemoState().localOrders[0].items[0].productionStatus).toBe('preparing');
    cleanup();
    renderPage(<OrdersPage />);
    await user.click((await screen.findAllByText(/1× Pizza grande/))[0]);
    expect(
      within(await screen.findByRole('dialog')).getAllByText('Em preparo').length,
    ).toBeGreaterThan(0);

    expect(demoSession.advanceTicket(ticket.id)).toBe(true);
    expect(getDemoState().localOrders[0].status).toBe('pronto');
    expect(demoSession.advanceTicket(ticket.id)).toBe(true);
    expect(getDemoState().localOrders[0].status).toBe('entregue');
    expect(getDemoState().localOrders[0].items[0].productionStatus).toBe('delivered');
  });

  it('avança itens diferentes sem alterar o total', () => {
    addPizza();
    demoSession.addProduct(cola);
    demoSession.addProduct(garlic);
    const sent = demoSession.sendToKitchen()!;
    const ticket = getDemoState().tickets[0];
    const [pizzaId, drinkId, starterId] = sent.items.map((item) => item.lineId!);
    const total = sent.totalCents;

    expect(demoSession.advanceTicketItem(ticket.id, pizzaId)).toBe(true);
    expect(demoSession.advanceTicketItem(ticket.id, drinkId)).toBe(true);
    expect(demoSession.advanceTicketItem(ticket.id, drinkId)).toBe(true);

    const order = getDemoState().localOrders[0];
    const byId = Object.fromEntries(order.items.map((item) => [item.lineId, item]));
    expect(byId[pizzaId].productionStatus).toBe('preparing');
    expect(byId[drinkId].productionStatus).toBe('ready');
    expect(byId[starterId].productionStatus).toBe('waiting');
    expect(order.status).toBe('em preparo');
    expect(order.totalCents).toBe(total);
    expect(getDemoState().tickets[0].status).toBe('preparing');
  });

  it('avança só a linha identificada quando o nome se repete', () => {
    addPizza('sem cebola');
    addPizza('extra orégano');
    const sent = demoSession.sendToKitchen()!;
    const [firstId, secondId] = sent.items.map((item) => item.lineId!);
    expect(firstId).not.toBe(secondId);
    const ticket = getDemoState().tickets[0];
    expect(demoSession.advanceTicketItem(ticket.id, firstId)).toBe(true);
    const order = getDemoState().localOrders[0];
    expect(order.items.find((item) => item.lineId === firstId)?.productionStatus).toBe('preparing');
    expect(order.items.find((item) => item.lineId === secondId)?.productionStatus).toBe('waiting');
  });

  it('rejeita transições inválidas sem corromper o estado', () => {
    addPizza();
    demoSession.sendToKitchen();
    const ticket = getDemoState().tickets[0];
    const lineId = ticket.items[0].lineId;
    demoSession.advanceTicketItem(ticket.id, lineId);
    demoSession.advanceTicketItem(ticket.id, lineId);
    demoSession.advanceTicketItem(ticket.id, lineId);
    const before = structuredClone(getDemoState().localOrders[0]);
    expect(demoSession.advanceTicketItem(ticket.id, lineId)).toBe(false);
    expect(demoSession.advanceTicketItem(ticket.id, 'linha-inexistente')).toBe(false);
    expect(demoSession.advanceTicket('ticket-inexistente')).toBe(false);
    expect(getDemoState().localOrders[0]).toEqual(before);
    expect(getDemoState().tickets[0].status).toBe('delivered');
  });

  it('mostra erro do cardápio e permite tentar de novo', async () => {
    const user = userEvent.setup();
    const listProducts = vi
      .spyOn(mockDataSource, 'listProducts')
      .mockRejectedValueOnce(new Error('falha controlada'))
      .mockResolvedValue(products);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <AppProviders>
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <PosPage />
          </MemoryRouter>
        </QueryClientProvider>
      </AppProviders>,
    );
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Não foi possível carregar o cardápio')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum produto encontrado')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('button', { name: 'Adicionar Calabresa' })).toBeInTheDocument();
    expect(listProducts).toHaveBeenCalledTimes(2);
    listProducts.mockRestore();
  });
});
