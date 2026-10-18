import { render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';
import { AppProviders } from '@/app/providers/app-providers';
import { DiningPage } from '@/features/dining/dining-page';
import { ChecksPage } from '@/features/orders/checks-page';
import { KitchenPage } from '@/features/kitchen/kitchen-page';
import {
  activeServiceFor,
  checkAccumulatedCents,
  demoSession,
  getDemoState,
  ordersForService,
  resetDemoSession,
} from '@/shared/demo/session';
import { formatBRL } from '@/shared/domain/money';
import { calculatePizzaPrice, sizeById } from '@/shared/domain/pizza';
import { products } from '@/shared/mocks/fixtures';

const cola = products.find((product) => product.id === 'dr_cola')!;
const suco = products.find((product) => product.id === 'dr_suco')!;

function renderPage(ui: ReactElement) {
  return render(
    <AppProviders>
      <MemoryRouter>{ui}</MemoryRouter>
    </AppProviders>,
  );
}

function table(id: string) {
  return getDemoState().tables.find((item) => item.id === id)!;
}

function addCola() {
  demoSession.addProduct(cola);
}

function addSuco() {
  demoSession.addProduct(suco);
}

function addCalabresaPizza() {
  const price = calculatePizzaPrice({
    size: sizeById('grande'),
    flavorPrices: { calabresa: 5890 },
    portions: [{ flavorId: 'calabresa', numerator: 1, denominator: 1 }],
    crustPriceCents: 0,
    extrasCents: 0,
    strategy: 'highest',
  });
  demoSession.addConfiguredItem({
    name: 'Pizza grande Calabresa',
    unitPriceCents: price.totalCents,
    pizza: {
      sizeId: 'grande',
      sizeName: 'Grande',
      flavors: [{ id: 'calabresa', name: 'Calabresa', numerator: 1, denominator: 1 }],
      crust: { id: 'tradicional', name: 'Tradicional', priceCents: 0 },
      extras: [],
    },
  });
  return price;
}

describe('atendimento por mesa', () => {
  it('abre uma mesa disponível e cria a comanda', async () => {
    const user = userEvent.setup();
    renderPage(<DiningPage />);
    await user.click(screen.getByRole('button', { name: /mesa 01, disponível/i }));
    const sheet = await screen.findByRole('dialog', { name: /mesa 01/i });
    await user.click(within(sheet).getByRole('button', { name: 'Abrir atendimento' }));
    expect(table('t01').status).toBe('occupied');
    expect(table('t01').guests).toBe(2);
    expect(table('t01').openedAt).toBeTruthy();
    const service = activeServiceFor(getDemoState().services, 't01');
    expect(service?.status).toBe('open');
    expect(service?.hostName).toBe('Mariana Alves');
    expect(service?.seedBalanceCents).toBe(0);
  });

  it('bloqueia a segunda abertura da mesma mesa', () => {
    expect(demoSession.openTable('t01', 2)).toBe(true);
    const first = activeServiceFor(getDemoState().services, 't01')!;
    expect(demoSession.openTable('t01', 3)).toBe(false);
    expect(table('t01').guests).toBe(2);
    expect(activeServiceFor(getDemoState().services, 't01')?.id).toBe(first.id);
    expect(
      getDemoState().services.filter((item) => item.tableId === 't01' && item.status !== 'closed'),
    ).toHaveLength(1);
  });

  it('não abre mesa indisponível nem reserva sem transição explícita inválida', () => {
    expect(demoSession.openTable('t14', 2)).toBe(false);
    expect(table('t14').status).toBe('unavailable');
    expect(demoSession.openTable('t17', 2)).toBe(true);
    expect(table('t17').status).toBe('occupied');
  });

  it('adiciona um pedido à mesa e atualiza o saldo', () => {
    demoSession.openTable('t01', 2);
    demoSession.selectTable('t01');
    addCola();
    const sent = demoSession.sendToKitchen()!;
    expect(sent.tableId).toBe('t01');
    expect(sent.channel).toBe('Mesa 01');
    expect(table('t01').billCents).toBe(sent.totalCents);
    const service = activeServiceFor(getDemoState().services, 't01')!;
    expect(service.orderIds).toEqual([sent.id]);
    expect(checkAccumulatedCents(service, getDemoState().localOrders)).toBe(table('t01').billCents);
  });

  it('envia pizza à cozinha vinculada ao atendimento', () => {
    demoSession.openTable('t02', 2);
    demoSession.selectTable('t02');
    const price = addCalabresaPizza();
    const sent = demoSession.sendToKitchen()!;
    expect(sent.items[0].pizza?.flavors[0].name).toBe('Calabresa');
    expect(sent.items[0].unitPriceCents).toBe(price.totalCents);
    expect(getDemoState().tickets[0].origin).toBe('Mesa 02');
    expect(getDemoState().tickets[0].items[0].pizza?.flavors[0].name).toBe('Calabresa');
    expect(table('t02').billCents).toBe(price.totalCents);
  });

  it('cria um segundo pedido no mesmo atendimento e consolida valores', () => {
    demoSession.openTable('t01', 2);
    demoSession.selectTable('t01');
    addCola();
    const first = demoSession.sendToKitchen()!;
    addSuco();
    const second = demoSession.sendToKitchen()!;
    const service = activeServiceFor(getDemoState().services, 't01')!;
    expect(service.orderIds).toEqual([first.id, second.id]);
    expect(ordersForService(getDemoState().localOrders, service)).toHaveLength(2);
    expect(table('t01').billCents).toBe(first.totalCents + second.totalCents);
    expect(checkAccumulatedCents(service, getDemoState().localOrders)).toBe(
      first.totalCents + second.totalCents,
    );
  });

  it('preserva o saldo demonstrativo anterior ao somar novos pedidos', () => {
    const seed = table('t03').billCents;
    demoSession.selectTable('t03');
    addCola();
    const sent = demoSession.sendToKitchen()!;
    const service = activeServiceFor(getDemoState().services, 't03')!;
    expect(service.seedBalanceCents).toBe(seed);
    expect(table('t03').billCents).toBe(seed + sent.totalCents);
    expect(checkAccumulatedCents(service, getDemoState().localOrders)).toBe(seed + sent.totalCents);
  });

  it('solicita a conta sem quitar nem liberar a mesa', () => {
    demoSession.openTable('t01', 2);
    demoSession.selectTable('t01');
    addCola();
    const sent = demoSession.sendToKitchen()!;
    expect(demoSession.requestBill('t01')).toBe(true);
    expect(table('t01').status).toBe('awaiting_bill');
    expect(table('t01').billCents).toBe(sent.totalCents);
    expect(activeServiceFor(getDemoState().services, 't01')?.status).toBe('awaiting_bill');
    expect(activeServiceFor(getDemoState().services, 't01')?.requestedBillAt).toBeTruthy();
  });

  it('bloqueia lançamentos com a conta solicitada até reabrir', () => {
    demoSession.openTable('t01', 2);
    demoSession.selectTable('t01');
    addCola();
    demoSession.sendToKitchen();
    demoSession.requestBill('t01');
    addSuco();
    expect(demoSession.sendToKitchen()).toBeNull();
    expect(getDemoState().lines).toHaveLength(1);
    expect(demoSession.openTable('t01', 2)).toBe(false);
    expect(demoSession.closeService('t01').ok).toBe(false);
    expect(demoSession.reopenService('t01')).toBe(true);
    expect(table('t01').status).toBe('occupied');
    const sent = demoSession.sendToKitchen()!;
    expect(sent.channel).toBe('Mesa 01');
    expect(activeServiceFor(getDemoState().services, 't01')?.requestedBillAt).toBeTruthy();
  });

  it('impede liberação sem encerramento válido no caixa', () => {
    demoSession.openTable('t01', 2);
    expect(demoSession.closeService('t01')).toEqual({ ok: false, reason: 'bill_required' });
    demoSession.requestBill('t01');
    expect(demoSession.closeService('t01')).toEqual({ ok: false, reason: 'cash_closed' });
    expect(table('t01').status).toBe('awaiting_bill');
    demoSession.openCash({
      operator: 'Carlos Mendes',
      openingFloatCents: 20000,
      note: '',
    });
    expect(demoSession.closeService('t01').ok).toBe(true);
    expect(table('t01').status).toBe('available');
    expect(table('t01').billCents).toBe(0);
    expect(activeServiceFor(getDemoState().services, 't01')).toBeUndefined();
  });

  it('isola alterações entre duas mesas', () => {
    demoSession.openTable('t01', 2);
    demoSession.selectTable('t01');
    addCola();
    const first = demoSession.sendToKitchen()!;
    demoSession.openTable('t02', 3);
    demoSession.selectTable('t02');
    addSuco();
    const second = demoSession.sendToKitchen()!;
    expect(table('t01').billCents).toBe(first.totalCents);
    expect(table('t02').billCents).toBe(second.totalCents);
    expect(table('t01').guests).toBe(2);
    expect(table('t02').guests).toBe(3);
    expect(first.tableId).toBe('t01');
    expect(second.tableId).toBe('t02');
    expect(activeServiceFor(getDemoState().services, 't01')?.orderIds).toEqual([first.id]);
    expect(activeServiceFor(getDemoState().services, 't02')?.orderIds).toEqual([second.id]);
  });

  it('preserva a integração com o KDS', async () => {
    demoSession.openTable('t01', 2);
    demoSession.selectTable('t01');
    addCalabresaPizza();
    const sent = demoSession.sendToKitchen()!;
    renderPage(<KitchenPage />);
    expect(screen.getAllByText('Mesa 01').length).toBeGreaterThan(0);
    expect(screen.getByText(/Pizza grande Calabresa/)).toBeInTheDocument();
    expect(demoSession.advanceTicket(getDemoState().tickets[0].id)).toBe(true);
    expect(getDemoState().localOrders[0].id).toBe(sent.id);
    expect(getDemoState().localOrders[0].items[0].productionStatus).toBe('preparing');
  });

  it('restaura o estado inicial após o reload da sessão', () => {
    demoSession.openTable('t01', 2);
    demoSession.selectTable('t01');
    addCola();
    demoSession.sendToKitchen();
    demoSession.requestBill('t01');
    resetDemoSession();
    expect(table('t01').status).toBe('available');
    expect(table('t01').billCents).toBe(0);
    expect(table('t03').status).toBe('occupied');
    expect(table('t03').billCents).toBe(8950);
    expect(getDemoState().localOrders).toHaveLength(0);
    expect(getDemoState().activeTableId).toBeNull();
    expect(activeServiceFor(getDemoState().services, 't01')).toBeUndefined();
    expect(activeServiceFor(getDemoState().services, 't03')?.seedBalanceCents).toBe(8950);
  });

  it('na comanda, bloqueia adicionar itens após pedir a conta', async () => {
    const user = userEvent.setup();
    demoSession.openTable('t01', 2);
    demoSession.selectTable('t01');
    addCola();
    demoSession.sendToKitchen();
    renderPage(<ChecksPage />);
    await user.click(await screen.findByRole('button', { name: /mesa 01/i }));
    const check = await screen.findByRole('dialog', { name: /mesa 01/i });
    expect(within(check).getByRole('button', { name: 'Adicionar itens' })).toBeInTheDocument();
    await user.click(within(check).getByRole('button', { name: 'Pedir conta' }));
    expect(
      within(check).queryByRole('button', { name: 'Adicionar itens' }),
    ).not.toBeInTheDocument();
    expect(within(check).getByText(/conta pendente/i)).toBeInTheDocument();
    expect(within(check).getByRole('button', { name: 'Reabrir atendimento' })).toBeInTheDocument();
    expect(table('t01').status).toBe('awaiting_bill');
  });

  it('mostra o saldo demonstrativo separado dos pedidos novos', async () => {
    const user = userEvent.setup();
    demoSession.selectTable('t03');
    addCola();
    demoSession.sendToKitchen();
    renderPage(<ChecksPage />);
    await user.click(await screen.findByRole('button', { name: /mesa 03/i }));
    const check = await screen.findByRole('dialog', { name: /mesa 03/i });
    expect(within(check).getByText('Saldo demonstrativo anterior')).toBeInTheDocument();
    expect(within(check).getByText(formatBRL(8950))).toBeInTheDocument();
    expect(within(check).getByText(/Coca-Cola/)).toBeInTheDocument();
    expect(within(check).getByText(formatBRL(table('t03').billCents))).toBeInTheDocument();
  });
});
