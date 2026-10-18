import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';
import { AppProviders } from '@/app/providers/app-providers';
import { CashPage } from '@/features/cash/cash-page';
import { drawerCashCents } from '@/shared/domain/bill';
import {
  activeServiceFor,
  demoSession,
  getDemoState,
  paymentsForService,
  serviceRemainingCents,
} from '@/shared/demo/session';
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

function openBill(tableId: string) {
  demoSession.openTable(tableId, 2);
  demoSession.selectTable(tableId);
  demoSession.addProduct(cola);
  const sent = demoSession.sendToKitchen()!;
  demoSession.requestBill(tableId);
  return sent;
}

function openCash() {
  return demoSession.openCash({
    operator: 'Carlos Mendes',
    openingFloatCents: 20000,
    note: '',
  });
}

describe('fechamento de contas', () => {
  it('registra pagamento integral e libera a mesa só depois do encerramento', () => {
    const sent = openBill('t01');
    openCash();
    const paid = demoSession.payBill('t01', { method: 'pix', tenderedCents: sent.totalCents });
    expect(paid.ok).toBe(true);
    if (!paid.ok) return;
    expect(paid.remainingCents).toBe(0);
    expect(table('t01').status).toBe('awaiting_bill');
    expect(demoSession.closeService('t01').ok).toBe(true);
    expect(table('t01').status).toBe('available');
  });

  it('mantém a conta aberta após pagamento parcial', () => {
    const sent = openBill('t01');
    openCash();
    const half = Math.floor(sent.totalCents / 2);
    const paid = demoSession.payBill('t01', { method: 'debit', tenderedCents: half });
    expect(paid.ok).toBe(true);
    if (!paid.ok) return;
    expect(paid.remainingCents).toBe(sent.totalCents - half);
    expect(table('t01').status).toBe('awaiting_bill');
    expect(demoSession.closeService('t01')).toEqual({ ok: false, reason: 'unpaid' });
  });

  it('aceita múltiplos meios até quitar', () => {
    const sent = openBill('t01');
    openCash();
    demoSession.payBill('t01', { method: 'pix', tenderedCents: 600 });
    demoSession.payBill('t01', { method: 'credit', tenderedCents: 500 });
    const rest = serviceRemainingCents(
      activeServiceFor(getDemoState().services, 't01')!,
      getDemoState().localOrders,
      getDemoState().payments,
    );
    const last = demoSession.payBill('t01', { method: 'debit', tenderedCents: rest });
    expect(last.ok).toBe(true);
    if (!last.ok) return;
    expect(last.remainingCents).toBe(0);
    expect(getDemoState().payments.filter((item) => item.tableId === 't01')).toHaveLength(3);
    expect(sent.totalCents).toBe(table('t01').billCents);
  });

  it('calcula troco sem inflar o valor aplicado nem a gaveta', () => {
    const sent = openBill('t01');
    openCash();
    const paid = demoSession.payBill('t01', {
      method: 'cash',
      tenderedCents: sent.totalCents + 2000,
    });
    expect(paid.ok).toBe(true);
    if (!paid.ok) return;
    expect(paid.payment.appliedCents).toBe(sent.totalCents);
    expect(paid.changeCents).toBe(2000);
    expect(paid.remainingCents).toBe(0);
    const cash = getDemoState().cash!;
    expect(drawerCashCents(cash.movements)).toBe(20000 + sent.totalCents);
    expect(cash.movements[0].amountCents).toBe(sent.totalCents);
  });

  it('recusa eletrônico acima do restante', () => {
    const sent = openBill('t01');
    openCash();
    const result = demoSession.payBill('t01', {
      method: 'pix',
      tenderedCents: sent.totalCents + 1,
    });
    expect(result).toEqual({ ok: false, reason: 'over_remaining' });
    expect(getDemoState().payments).toHaveLength(0);
  });

  it('ignora clique duplo no mesmo pagamento', () => {
    const sent = openBill('t01');
    openCash();
    const first = demoSession.payBill('t01', { method: 'pix', tenderedCents: 400 });
    const second = demoSession.payBill('t01', { method: 'pix', tenderedCents: 400 });
    expect(first.ok).toBe(true);
    expect(second).toEqual({ ok: false, reason: 'duplicate' });
    expect(getDemoState().payments).toHaveLength(1);
    expect(sent.totalCents).toBeGreaterThan(400);
  });

  it('não quita a mesma conta duas vezes', () => {
    const sent = openBill('t01');
    openCash();
    expect(demoSession.payBill('t01', { method: 'pix', tenderedCents: sent.totalCents }).ok).toBe(
      true,
    );
    expect(demoSession.payBill('t01', { method: 'pix', tenderedCents: 100 })).toEqual({
      ok: false,
      reason: 'settled',
    });
  });

  it('não registra pagamento sem caixa aberto', () => {
    const sent = openBill('t01');
    expect(demoSession.payBill('t01', { method: 'pix', tenderedCents: sent.totalCents })).toEqual({
      ok: false,
      reason: 'cash_closed',
    });
    expect(table('t01').status).toBe('awaiting_bill');
  });

  it('isola pagamentos entre duas mesas', () => {
    openBill('t01');
    demoSession.openTable('t02', 2);
    demoSession.selectTable('t02');
    demoSession.addProduct(suco);
    const second = demoSession.sendToKitchen()!;
    demoSession.requestBill('t02');
    openCash();
    demoSession.payBill('t01', { method: 'pix', tenderedCents: 500 });
    demoSession.payBill('t02', { method: 'debit', tenderedCents: second.totalCents });
    const svc1 = activeServiceFor(getDemoState().services, 't01')!;
    const svc2 = activeServiceFor(getDemoState().services, 't02')!;
    expect(
      paymentsForService(getDemoState().payments, svc1.id).every((item) => item.tableId === 't01'),
    ).toBe(true);
    expect(paymentsForService(getDemoState().payments, svc2.id)[0].appliedCents).toBe(
      second.totalCents,
    );
    expect(serviceRemainingCents(svc2, getDemoState().localOrders, getDemoState().payments)).toBe(
      0,
    );
    expect(
      serviceRemainingCents(svc1, getDemoState().localOrders, getDemoState().payments),
    ).toBeGreaterThan(0);
  });

  it('não altera itens após a quitação', () => {
    const sent = openBill('t01');
    const before = structuredClone(getDemoState().localOrders[0]);
    openCash();
    demoSession.payBill('t01', { method: 'pix', tenderedCents: sent.totalCents });
    demoSession.closeService('t01');
    expect(getDemoState().localOrders[0].items).toEqual(before.items);
    expect(getDemoState().localOrders[0].totalCents).toBe(before.totalCents);
    expect(getDemoState().payments).toHaveLength(1);
  });

  it('fecha o caixa sem apagar pagamentos da conta', () => {
    const sent = openBill('t01');
    openCash();
    demoSession.payBill('t01', { method: 'pix', tenderedCents: sent.totalCents });
    expect(demoSession.closeCash()).toBeTruthy();
    expect(getDemoState().cash).toBeNull();
    expect(getDemoState().payments).toHaveLength(1);
    expect(demoSession.closeService('t01').ok).toBe(true);
  });

  it('não entra Pix na gaveta em espécie', () => {
    const sent = openBill('t01');
    openCash();
    demoSession.payBill('t01', { method: 'pix', tenderedCents: sent.totalCents });
    expect(drawerCashCents(getDemoState().cash!.movements)).toBe(20000);
  });
});

describe('caixa na interface', () => {
  it('recebe o restante e encerra a mesa', async () => {
    const user = userEvent.setup();
    const sent = openBill('t01');
    renderPage(<CashPage />);
    await user.click(screen.getByRole('button', { name: 'Abrir turno' }));
    expect(await screen.findByText(/conferência da mesa 01/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pagar o restante' }));
    expect(await screen.findByText(/conta quitada/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Encerrar atendimento' }));
    expect(table('t01').status).toBe('available');
    expect(sent.totalCents).toBeGreaterThan(0);
  });
});
