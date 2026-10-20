import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { render } from '@testing-library/react';
import { AppProviders } from '@/app/providers/app-providers';
import { createAppRoutes } from '@/app/router/router';
import { login, selectEstablishment, getAuthSnapshot, resetAuthSession } from '@/shared/auth/session';
import { peekPaymentAttempt } from '@/shared/billing/payment-attempt';
import { appQueryClient } from '@/shared/api/query-client';
import { configureRuntimeForTests } from '@/shared/config/runtime';
import type { BillResponse, PaymentResponse } from '@/shared/api/billing';
import type { CashSessionResponse } from '@/shared/api/cash';
import type { TableResponse } from '@/shared/api/dining';
import {
  apiContext,
  apiEst,
  apiEstBairro,
  apiMe,
  apiOrg,
  apiTokens,
  jsonResponse,
  problem,
} from '@/test/api-fixtures';
import {
  counterBillId,
  makeBill,
  makeCashSession,
  makeCounterBill,
  makePayment,
  tableBillId,
} from '@/test/billing-fixtures';
import {
  bairroTable,
  centroOccupied,
  makeTable,
  serviceOpenId,
} from '@/test/dining-fixtures';
import { makeOrder, makePizzaOrder } from '@/test/orders-fixtures';
import { ChecksPage } from '@/features/orders/checks-page';
import { MemoryRouter } from 'react-router';

type Role = 'ADMIN' | 'CASHIER' | 'WAITER' | 'KITCHEN';
type Scenario = 'ok' | 'multi' | 'timeout-once' | 'pay-error' | 'conflict' | 'no-cash';

function occupancyOf(table: TableResponse): TableResponse['occupancy'] {
  if (table.activeService && table.activeService.status === 'AWAITING_BILL') return 'AWAITING_BILL';
  if (table.activeService && table.activeService.status === 'OPEN') return 'OCCUPIED';
  return table.occupancy;
}

function hashOf(method: string, tendered: number) {
  return `${method}:${tendered}`;
}

function stubBilling(role: Role = 'ADMIN', scenario: Scenario = 'ok') {
  const tables = new Map<string, TableResponse[]>([
    [apiEst.id, [structuredClone(centroOccupied), makeTable()]],
    [apiEstBairro.id, [structuredClone(bairroTable)]],
  ]);
  const bills = new Map<string, BillResponse>([
    [
      tableBillId,
      scenario === 'multi'
        ? makeBill({
            subtotalCents: 2400,
            totalCents: 2400,
            remainingCents: 2400,
            orders: [
              {
                id: makeOrder().id,
                number: 12,
                subtotalCents: 800,
                discountCents: 0,
                totalCents: 800,
                placedAt: '2026-10-19T12:20:00Z',
                items: makeOrder().items as BillResponse['orders'][number]['items'],
              },
              {
                id: 'a3a3a3a3-a3a3-43a3-83a3-a3a3a3a3a3a3',
                number: 14,
                subtotalCents: 1600,
                discountCents: 0,
                totalCents: 1600,
                placedAt: '2026-10-19T12:25:00Z',
                items: makeOrder().items.map((item) => ({
                  ...item,
                  id: 'b3b3b3b3-b3b3-43b3-83b3-b3b3b3b3b3b3',
                  quantity: 2,
                  lineTotalCents: 1600,
                })) as BillResponse['orders'][number]['items'],
              },
            ],
          })
        : makeBill(),
    ],
    [counterBillId, makeCounterBill()],
  ]);
  const orders = [makeOrder(), makePizzaOrder()];
  let cash: CashSessionResponse | null =
    scenario === 'no-cash' ? null : makeCashSession();
  const keys = new Map<string, { hash: string; payment: PaymentResponse }>();
  let timedOut = scenario === 'timeout-once';
  const finance = role === 'ADMIN' || role === 'CASHIER';
  const operate = role === 'ADMIN' || role === 'CASHIER' || role === 'WAITER';
  const readBill = operate;

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const parsed = new URL(url);
    const path = parsed.pathname;
    const method = (init?.method ?? 'GET').toUpperCase();
    const bodyText = typeof init?.body === 'string' ? init.body : '';
    const headers = new Headers(init?.headers);
    if (method === 'POST' && path === '/api/v1/auth/login') return jsonResponse(apiTokens);
    if (method === 'POST' && path === '/api/v1/auth/refresh') {
      return problem(401, 'UNAUTHENTICATED', 'Não autenticado', 'A solicitação exige autenticação.');
    }
    if (method === 'GET' && path === '/api/v1/me') return jsonResponse(apiMe);
    if (method === 'POST' && path === '/api/v1/me/context') {
      const body = JSON.parse(bodyText || '{}') as { establishmentId: string };
      const establishment = body.establishmentId === apiEstBairro.id ? apiEstBairro : apiEst;
      return jsonResponse({
        ...apiContext,
        establishment,
        establishmentRole: role,
        organizationRole: role === 'ADMIN' ? 'ADMIN' : null,
      });
    }
    const match = path.match(/^\/api\/v1\/establishments\/([0-9a-f-]+)\/(.*)$/i);
    if (!match) return problem(404, 'NOT_FOUND', 'Não encontrado', 'Sem mock.');
    const establishmentId = match[1];
    const rest = match[2];
    if (establishmentId !== apiEst.id && establishmentId !== apiEstBairro.id) {
      return problem(404, 'NOT_FOUND', 'Não encontrado', 'O recurso não foi encontrado.');
    }
    if (method === 'GET' && rest === 'tables') {
      return jsonResponse((tables.get(establishmentId) ?? []).map((table) => ({ ...table, occupancy: occupancyOf(table) })));
    }
    if (method === 'GET' && rest === 'orders') {
      const items = orders
        .filter((item) => item.establishmentId === establishmentId)
        .map((item) => ({
          id: item.id,
          establishmentId: item.establishmentId,
          channel: item.channel,
          tableId: item.tableId,
          tableServiceId: item.tableServiceId,
          number: item.number,
          placedByName: item.placedByName,
          subtotalCents: item.subtotalCents,
          discountCents: item.discountCents,
          totalCents: item.totalCents,
          commercialStatus: item.commercialStatus,
          productionStatus: item.productionStatus,
          placedAt: item.placedAt,
        }));
      return jsonResponse({ items, page: 0, size: 50, total: items.length });
    }
    const serviceBill = rest.match(/^table-services\/([0-9a-f-]+)\/bill$/i);
    if (method === 'GET' && serviceBill) {
      if (!readBill) return problem(403, 'FORBIDDEN', 'Acesso negado', 'Sem acesso financeiro.');
      const found = [...bills.values()].find(
        (bill) => bill.establishmentId === establishmentId && bill.tableServiceId === serviceBill[1],
      );
      if (!found) return problem(404, 'NOT_FOUND', 'Não encontrado', 'Conta ausente.');
      return jsonResponse(found);
    }
    const orderBill = rest.match(/^orders\/([0-9a-f-]+)\/bill$/i);
    if (method === 'GET' && orderBill) {
      if (!readBill) return problem(403, 'FORBIDDEN', 'Acesso negado', 'Sem acesso financeiro.');
      const found = [...bills.values()].find(
        (bill) => bill.establishmentId === establishmentId && bill.orderId === orderBill[1],
      );
      if (!found) return problem(404, 'NOT_FOUND', 'Não encontrado', 'Conta ausente.');
      return jsonResponse(found);
    }
    const billGet = rest.match(/^bills\/([0-9a-f-]+)$/i);
    if (method === 'GET' && billGet) {
      if (!readBill) return problem(403, 'FORBIDDEN', 'Acesso negado', 'Sem acesso financeiro.');
      const found = bills.get(billGet[1]);
      if (!found || found.establishmentId !== establishmentId) {
        return problem(404, 'NOT_FOUND', 'Não encontrado', 'Conta ausente.');
      }
      return jsonResponse(found);
    }
    const billPayments = rest.match(/^bills\/([0-9a-f-]+)\/payments$/i);
    if (method === 'GET' && billPayments) {
      if (!readBill) return problem(403, 'FORBIDDEN', 'Acesso negado', 'Sem acesso financeiro.');
      const found = bills.get(billPayments[1]);
      return jsonResponse({ items: found?.payments ?? [] });
    }
    if (method === 'POST' && billPayments) {
      if (!finance) return problem(403, 'FORBIDDEN', 'Acesso negado', 'Sem acesso financeiro.');
      const bill = bills.get(billPayments[1]);
      if (!bill || bill.establishmentId !== establishmentId) {
        return problem(404, 'NOT_FOUND', 'Não encontrado', 'Conta ausente.');
      }
      if (!cash || cash.status !== 'OPEN') {
        return problem(422, 'CASH_SESSION_NOT_OPEN', 'Caixa fechado', 'Abra o caixa antes de registrar um pagamento.');
      }
      if (timedOut) {
        timedOut = false;
        throw new TypeError('Failed to fetch');
      }
      if (scenario === 'pay-error') {
        return problem(422, 'EMPTY_TENDER', 'Não processável', 'Informe um valor maior que zero.');
      }
      const key = headers.get('Idempotency-Key') ?? '';
      const body = JSON.parse(bodyText || '{}') as { method: PaymentResponse['method']; tenderedCents: number };
      const hash = hashOf(body.method, body.tenderedCents);
      const existing = keys.get(`${establishmentId}:${key}`);
      if (existing) {
        if (existing.hash !== hash) {
          return problem(409, 'IDEMPOTENCY_CONFLICT', 'Conflito', 'A mesma chave foi usada com outro pagamento.');
        }
        return jsonResponse(existing.payment);
      }
      if (scenario === 'conflict' && keys.size > 0) {
        return problem(409, 'IDEMPOTENCY_CONFLICT', 'Conflito', 'A mesma chave foi usada com outro pagamento.');
      }
      if (bill.remainingCents <= 0) {
        return problem(422, 'BILL_SETTLED', 'Quitada', 'A conta já está quitada.');
      }
      if (body.tenderedCents <= 0) {
        return problem(422, 'EMPTY_TENDER', 'Vazio', 'Informe um valor maior que zero.');
      }
      const applied =
        body.method === 'CASH' ? Math.min(body.tenderedCents, bill.remainingCents) : body.tenderedCents;
      const change = body.method === 'CASH' ? Math.max(0, body.tenderedCents - bill.remainingCents) : 0;
      if (body.method !== 'CASH' && body.tenderedCents > bill.remainingCents) {
        return problem(422, 'OVER_REMAINING', 'Acima do saldo', 'PIX e cartão não aceitam valor acima do saldo restante.');
      }
      const payment = makePayment({
        id: crypto.randomUUID(),
        billId: bill.id,
        method: body.method,
        tenderedCents: body.tenderedCents,
        appliedCents: applied,
        changeCents: change,
      });
      const paidCents = bill.paidCents + applied;
      const remainingCents = bill.totalCents - paidCents;
      const status = remainingCents === 0 ? 'SETTLED' : paidCents > 0 ? 'PARTIALLY_PAID' : 'OPEN';
      const next: BillResponse = {
        ...bill,
        paidCents,
        remainingCents,
        status,
        settled: status === 'SETTLED',
        version: bill.version + 1,
        payments: [...bill.payments, payment],
      };
      bills.set(bill.id, next);
      keys.set(`${establishmentId}:${key}`, { hash, payment });
      if (cash) {
        const sale = {
          id: crypto.randomUUID(),
          type: 'SALE' as const,
          method: body.method,
          amountCents: applied,
          paymentId: payment.id,
          recordedByName: apiMe.user.name,
          notes: null,
          recordedAt: '2026-10-20T12:46:00Z',
        };
        const totals = { ...cash.totalsByMethod };
        totals[body.method] = (totals[body.method] ?? 0) + applied;
        const drawerDelta = body.method === 'CASH' ? applied : 0;
        cash = {
          ...cash,
          totalsByMethod: totals,
          drawerCashCents: cash.drawerCashCents + drawerDelta,
          expectedCashCents: cash.expectedCashCents + drawerDelta,
          movements: [...cash.movements, sale],
        };
      }
      return jsonResponse(payment, 201);
    }
    if (method === 'GET' && rest === 'cash/sessions/current') {
      if (!finance) return problem(403, 'FORBIDDEN', 'Acesso negado', 'Sem acesso financeiro.');
      if (!cash || cash.status !== 'OPEN') return problem(404, 'NOT_FOUND', 'Não encontrado', 'Sem caixa aberto.');
      return jsonResponse(cash);
    }
    if (method === 'POST' && rest === 'cash/sessions') {
      if (!finance) return problem(403, 'FORBIDDEN', 'Acesso negado', 'Sem acesso financeiro.');
      if (cash && cash.status === 'OPEN') {
        return problem(409, 'CASH_SESSION_OPEN', 'Já aberto', 'Já existe um caixa aberto neste estabelecimento.');
      }
      const body = JSON.parse(bodyText || '{}') as { openingFloatCents: number; notes?: string };
      cash = makeCashSession({
        establishmentId,
        openingFloatCents: body.openingFloatCents,
        drawerCashCents: body.openingFloatCents,
        expectedCashCents: body.openingFloatCents,
        notes: body.notes ?? null,
      });
      return jsonResponse(cash, 201);
    }
    const cashMove = rest.match(/^cash\/sessions\/([0-9a-f-]+)\/movements$/i);
    if (method === 'POST' && cashMove) {
      if (!finance) return problem(403, 'FORBIDDEN', 'Acesso negado', 'Sem acesso financeiro.');
      if (!cash || cash.id !== cashMove[1] || cash.status !== 'OPEN') {
        return problem(422, 'CASH_SESSION_CLOSED', 'Fechado', 'O caixa já está fechado.');
      }
      const body = JSON.parse(bodyText || '{}') as { type: 'SUPPLY' | 'BLEED'; amountCents: number; notes?: string };
      if (body.type === 'BLEED' && body.amountCents > cash.drawerCashCents) {
        return problem(422, 'INSUFFICIENT_CASH', 'Saldo insuficiente', 'A sangria não pode superar o saldo em espécie.');
      }
      const delta = body.type === 'SUPPLY' ? body.amountCents : -body.amountCents;
      const movement = {
        id: crypto.randomUUID(),
        type: body.type,
        method: null,
        amountCents: body.amountCents,
        paymentId: null,
        recordedByName: apiMe.user.name,
        notes: body.notes ?? null,
        recordedAt: '2026-10-20T12:47:00Z',
      };
      cash = {
        ...cash,
        drawerCashCents: cash.drawerCashCents + delta,
        expectedCashCents: cash.expectedCashCents + delta,
        movements: [...cash.movements, movement],
      };
      return jsonResponse(cash);
    }
    const cashClose = rest.match(/^cash\/sessions\/([0-9a-f-]+)\/close$/i);
    if (method === 'POST' && cashClose) {
      if (!finance) return problem(403, 'FORBIDDEN', 'Acesso negado', 'Sem acesso financeiro.');
      if (!cash || cash.id !== cashClose[1]) return problem(404, 'NOT_FOUND', 'Não encontrado', 'Caixa ausente.');
      cash = {
        ...cash,
        status: 'CLOSED',
        closedAt: '2026-10-20T13:00:00Z',
        closedByName: apiMe.user.name,
      };
      return jsonResponse(cash);
    }
    const tableClose = rest.match(/^tables\/([0-9a-f-]+)\/service\/close$/i);
    if (method === 'POST' && tableClose) {
      if (!operate) return problem(403, 'FORBIDDEN', 'Acesso negado', 'Sem operação de salão.');
      const bill = [...bills.values()].find((item) => item.tableId === tableClose[1] && item.establishmentId === establishmentId);
      if (!bill?.settled) {
        return problem(409, 'CLOSE_REQUIRES_SETTLEMENT', 'Conta em aberto', 'O atendimento só pode ser encerrado com a conta quitada.');
      }
      const bucket = tables.get(establishmentId) ?? [];
      tables.set(
        establishmentId,
        bucket.map((table) =>
          table.id === tableClose[1] ? { ...table, occupancy: 'AVAILABLE', activeService: null } : table,
        ),
      );
      return jsonResponse({
        id: serviceOpenId,
        tableId: tableClose[1],
        establishmentId,
        status: 'CLOSED',
        guests: 3,
        openedByUserId: apiMe.user.id,
        hostName: 'Ana Costa',
        openedAt: '2026-10-19T12:10:00Z',
        requestedBillAt: '2026-10-19T12:40:00Z',
        closedAt: '2026-10-20T13:05:00Z',
        version: 3,
      });
    }
    if (method === 'GET' && /^tables\/[0-9a-f-]+\/services$/i.test(rest)) {
      return jsonResponse({ items: [], page: 0, size: 10, total: 0 });
    }
    if (method === 'GET' && rest.startsWith('tables/')) {
      const id = rest.split('/')[1];
      const found = (tables.get(establishmentId) ?? []).find((item) => item.id === id);
      if (!found) return problem(404, 'NOT_FOUND', 'Não encontrado', 'Mesa ausente.');
      return jsonResponse({ ...found, occupancy: occupancyOf(found) });
    }
    return problem(404, 'NOT_FOUND', 'Não encontrado', 'Sem mock financeiro.');
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, bills, getCash: () => cash };
}

function renderApp(path: string) {
  const router = createMemoryRouter(createAppRoutes(), { initialEntries: [path] });
  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}

async function enterCentro(role: Role = 'ADMIN', scenario: Scenario = 'ok') {
  configureRuntimeForTests({ mode: 'api', apiBaseUrl: 'http://127.0.0.1:8080' });
  resetAuthSession();
  const stub = stubBilling(role, scenario);
  await login('ana@example.com', 'password10');
  await selectEstablishment(apiOrg.id, apiEst.id);
  return stub;
}

describe('comandas, pagamentos e caixa API', () => {
  it('mostra comanda de um pedido sem desconto DEMO', async () => {
    await enterCentro();
    const user = userEvent.setup();
    renderApp('/comandas');
    expect(await screen.findByRole('heading', { name: 'Comandas' })).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /mesa 02/i }));
    expect((await screen.findAllByText('Pedido #12')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Refrigerante').length).toBeGreaterThan(0);
    expect(screen.getAllByText('R$ 8,00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Descontos').length).toBeGreaterThan(0);
    expect(screen.queryByText(/saldo demonstrativo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/10%/)).not.toBeInTheDocument();
  });

  it('soma múltiplos pedidos na mesma conta', async () => {
    await enterCentro('ADMIN', 'multi');
    const user = userEvent.setup();
    renderApp('/comandas');
    await user.click(await screen.findByRole('button', { name: /mesa 02/i }));
    expect((await screen.findAllByText('Pedido #12')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pedido #14').length).toBeGreaterThan(0);
    expect(screen.getAllByText('R$ 24,00').length).toBeGreaterThan(0);
  });

  it('registra pagamento parcial, integral, PIX e dinheiro com troco', async () => {
    const stub = await enterCentro();
    const user = userEvent.setup();
    renderApp('/caixa');
    expect(await screen.findByRole('heading', { name: 'Caixa do turno' })).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Mesa 02' }));
    await user.click(await screen.findByRole('radio', { name: 'Pix' }));
    await user.clear(screen.getByLabelText('Valor do pagamento'));
    await user.type(screen.getByLabelText('Valor do pagamento'), '400');
    await user.click(screen.getByRole('button', { name: 'Registrar pagamento' }));
    expect(await screen.findByText(/pagamento registrado/i)).toBeInTheDocument();
    expect(await screen.findByText(/pagamento parcial/i)).toBeInTheDocument();
    const drawerAfterPix = stub.getCash()?.drawerCashCents;
    expect(drawerAfterPix).toBe(20000);
    await user.click(screen.getByRole('radio', { name: 'Dinheiro' }));
    await user.clear(screen.getByLabelText('Valor recebido em dinheiro'));
    await user.type(screen.getByLabelText('Valor recebido em dinheiro'), '500');
    await user.click(screen.getByRole('button', { name: 'Registrar pagamento' }));
    expect((await screen.findAllByText(/troco r\$ 1,00/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/quitada/i)).length).toBeGreaterThan(0);
    expect(stub.getCash()?.drawerCashCents).toBe(20400);
    expect(screen.queryByRole('button', { name: 'Registrar pagamento' })).not.toBeInTheDocument();
  });

  it('reutiliza a chave após timeout e recusa payload diferente', async () => {
    const stub = await enterCentro('ADMIN', 'timeout-once');
    const user = userEvent.setup();
    renderApp('/caixa');
    await screen.findByRole('heading', { name: 'Caixa do turno' });
    await user.click(await screen.findByRole('button', { name: 'Mesa 02' }));
    await user.click(await screen.findByRole('button', { name: 'Pagar o restante' }));
    expect(await screen.findByText(/confirmação não chegou/i)).toBeInTheDocument();
    const key = peekPaymentAttempt(tableBillId);
    expect(key).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Pagar o restante' }));
    expect((await screen.findAllByText(/quitada/i)).length).toBeGreaterThan(0);
    const payCalls = stub.fetchMock.mock.calls.filter((call) => {
      const init = call[1] as RequestInit | undefined;
      return (init?.method ?? 'GET') === 'POST' && String(call[0]).includes('/payments');
    });
    const keys = payCalls.map((call) => new Headers((call[1] as RequestInit).headers).get('Idempotency-Key'));
    expect(keys[0]).toBe(keys[1]);
    expect(peekPaymentAttempt(tableBillId)).toBeNull();
  });

  it('mostra erro recuperável sem lançar otimisticamente', async () => {
    await enterCentro('ADMIN', 'pay-error');
    const user = userEvent.setup();
    renderApp('/caixa');
    await screen.findByRole('heading', { name: 'Caixa do turno' });
    await user.click(await screen.findByRole('button', { name: 'Mesa 02' }));
    await user.click(await screen.findByRole('button', { name: 'Pagar o restante' }));
    expect((await screen.findAllByText(/pagamento não confirmado/i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/conta pendente/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar pagamento' })).toBeInTheDocument();
  });

  it('abre caixa, registra suprimento e recusa sangria maior que a gaveta', async () => {
    await enterCentro('ADMIN', 'no-cash');
    const user = userEvent.setup();
    renderApp('/caixa');
    expect(await screen.findByRole('heading', { name: 'Abrir caixa' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Abrir turno' }));
    expect(await screen.findByRole('heading', { name: 'Caixa do turno' })).toBeInTheDocument();
    expect(screen.getAllByText(/ana costa/i).length).toBeGreaterThan(0);
    await user.clear(screen.getByLabelText('Motivo da movimentação'));
    await user.type(screen.getByLabelText('Motivo da movimentação'), 'Suprimento manhã');
    const amount = screen.getAllByRole('textbox').at(-1)!;
    await user.clear(amount);
    await user.type(amount, '3000');
    await user.click(screen.getByRole('button', { name: 'Registrar suprimento' }));
    expect(await screen.findByText(/suprimento registrado/i)).toBeInTheDocument();
    await user.clear(amount);
    await user.type(amount, '999999');
    await user.click(screen.getByRole('button', { name: 'Registrar sangria' }));
    expect((await screen.findAllByText(/sangria não pode superar/i)).length).toBeGreaterThan(0);
  });

  it('fecha o caixa no servidor e bloqueia novo pagamento', async () => {
    await enterCentro();
    const user = userEvent.setup();
    renderApp('/caixa');
    await screen.findByRole('heading', { name: 'Caixa do turno' });
    await user.click(screen.getByRole('button', { name: 'Fechar caixa' }));
    const closeDialog = await screen.findByRole('alertdialog');
    await user.click(within(closeDialog).getByRole('button', { name: 'Fechar caixa' }));
    expect(await screen.findByRole('heading', { name: 'Abrir caixa' })).toBeInTheDocument();
  });

  it('quita a mesa só depois de SETTLED e recusa encerramento antecipado', async () => {
    await enterCentro();
    const user = userEvent.setup();
    const mesas = renderApp('/mesas');
    await user.click(await screen.findByRole('button', { name: /mesa 02, ocupada/i }));
    const sheet = await screen.findByRole('dialog', { name: /mesa 02/i });
    expect(within(sheet).queryByRole('button', { name: 'Encerrar atendimento' })).not.toBeInTheDocument();
    mesas.unmount();
    renderApp('/caixa');
    await screen.findByRole('heading', { name: 'Caixa do turno' });
    await user.click(await screen.findByRole('button', { name: 'Mesa 02' }));
    await user.click(await screen.findByRole('button', { name: 'Pagar o restante' }));
    expect((await screen.findAllByText(/quitada/i)).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Encerrar atendimento' }));
    expect(await screen.findByText(/liberada/i)).toBeInTheDocument();
  });

  it('permite quitar venda de balcão sem criar mesa', async () => {
    await enterCentro();
    const user = userEvent.setup();
    renderApp('/comandas');
    await user.click(await screen.findByRole('button', { name: /balcão/i }));
    expect((await screen.findAllByText('Pedido #13')).length).toBeGreaterThan(0);
    expect(screen.queryByText(/mesa artificial/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Receber pagamento' }));
    expect(await screen.findByRole('heading', { name: 'Caixa do turno' })).toBeInTheDocument();
  });

  it('respeita RBAC de caixa, garçom e cozinha', async () => {
    await enterCentro('WAITER');
    const waiterChecks = renderApp('/comandas');
    expect(await screen.findByText('Mesa 02')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Receber pagamento' })).not.toBeInTheDocument();
    waiterChecks.unmount();
    const waiterCash = renderApp('/caixa');
    expect(await screen.findByText(/abertura, sangria e pagamentos ficam com o caixa/i)).toBeInTheDocument();
    waiterCash.unmount();

    configureRuntimeForTests({ mode: 'api', apiBaseUrl: 'http://127.0.0.1:8080' });
    resetAuthSession();
    appQueryClient.clear();
    stubBilling('CASHIER');
    await login('ana@example.com', 'password10');
    await selectEstablishment(apiOrg.id, apiEst.id);
    const cashier = renderApp('/caixa');
    await screen.findByRole('heading', { name: 'Caixa do turno' });
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Mesa 02' }));
    expect(await screen.findByRole('button', { name: 'Registrar pagamento' })).toBeInTheDocument();
    cashier.unmount();

    configureRuntimeForTests({ mode: 'api', apiBaseUrl: 'http://127.0.0.1:8080' });
    resetAuthSession();
    appQueryClient.clear();
    stubBilling('KITCHEN');
    await login('ana@example.com', 'password10');
    await selectEstablishment(apiOrg.id, apiEst.id);
    renderApp('/comandas');
    expect(await screen.findByText('Acesso negado')).toBeInTheDocument();
  });

  it('trata conflito de chave com payload diferente', async () => {
    await enterCentro('ADMIN', 'conflict');
    const user = userEvent.setup();
    renderApp('/caixa');
    await screen.findByRole('heading', { name: 'Caixa do turno' });
    await user.click(await screen.findByRole('button', { name: 'Mesa 02' }));
    await user.click(await screen.findByRole('radio', { name: 'Pix' }));
    await user.clear(screen.getByLabelText('Valor do pagamento'));
    await user.type(screen.getByLabelText('Valor do pagamento'), '400');
    await user.click(screen.getByRole('button', { name: 'Registrar pagamento' }));
    expect(await screen.findByText(/pagamento parcial/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pagar o restante' }));
    expect((await screen.findAllByText(/mesma confirmação foi usada com outro valor/i)).length).toBeGreaterThan(
      0,
    );
    expect(peekPaymentAttempt(tableBillId)).toBeNull();
  });

  it('isola cache ao trocar de estabelecimento', async () => {
    await enterCentro();
    const first = renderApp('/comandas');
    expect(await screen.findByText('Mesa 02')).toBeInTheDocument();
    expect(appQueryClient.getQueryCache().findAll({ queryKey: ['billing', apiEst.id] }).length).toBeGreaterThan(0);
    first.unmount();
    await selectEstablishment(apiOrg.id, apiEstBairro.id);
    expect(getAuthSnapshot().context?.establishment?.id).toBe(apiEstBairro.id);
    expect(appQueryClient.getQueryCache().findAll({ queryKey: ['billing', apiEst.id] })).toHaveLength(0);
    renderApp('/comandas');
    expect(await screen.findByText(/nenhuma comanda aberta/i)).toBeInTheDocument();
    expect(screen.queryByText('Mesa 02')).not.toBeInTheDocument();
  });

  it('preserva o DEMO sem chamar billing', async () => {
    configureRuntimeForTests({ mode: 'demo', apiBaseUrl: 'http://127.0.0.1:8080' });
    resetAuthSession();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    render(
      <AppProviders>
        <MemoryRouter>
          <ChecksPage />
        </MemoryRouter>
      </AppProviders>,
    );
    expect(await screen.findByRole('heading', { name: 'Comandas' })).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('idempotência de pagamento', () => {
  it('preserva a chave até o sucesso', async () => {
    await enterCentro('ADMIN', 'timeout-once');
    const user = userEvent.setup();
    renderApp('/caixa');
    await screen.findByRole('heading', { name: 'Caixa do turno' });
    await user.click(await screen.findByRole('button', { name: 'Mesa 02' }));
    await user.click(await screen.findByRole('button', { name: 'Pagar o restante' }));
    await screen.findByText(/confirmação não chegou/i);
    expect(peekPaymentAttempt(tableBillId)).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Pagar o restante' })).toBeEnabled());
  });
});
