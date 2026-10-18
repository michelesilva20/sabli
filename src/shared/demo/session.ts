import { useSyncExternalStore } from 'react';
import { nextKitchenStatus, type KitchenStatus } from '@/shared/domain/kitchen';
import { orderDiscountCents, orderSubtotalCents, orderTotalCents } from '@/shared/domain/order';
import { minutesAgoIso } from '@/shared/domain/date';
import { currentUser, diningTables, kitchenSeeds, products, staff } from '@/shared/mocks/fixtures';
import type { PaymentMethod, StaffMember } from '@/shared/types/domain';

export interface OrderLine {
  id: string;
  name: string;
  detail?: string;
  quantity: number;
  unitPriceCents: number;
  notes?: string;
}

export interface LiveTicket {
  id: string;
  number: string;
  origin: string;
  status: KitchenStatus;
  priority: 'normal' | 'high';
  createdAt: string;
  items: { name: string; quantity: number; notes?: string }[];
}

export interface LiveTable {
  id: string;
  number: number;
  seats: number;
  status: 'available' | 'occupied' | 'awaiting_bill' | 'reserved' | 'unavailable';
  guests: number;
  billCents: number;
  openedAt: string | null;
  area: string;
  x: number;
  y: number;
}

export interface CashMovement {
  id: string;
  type: 'opening' | 'sale' | 'in' | 'out';
  label: string;
  amountCents: number;
  method?: PaymentMethod;
  at: string;
}

export interface CashSession {
  openedAt: string;
  openingFloatCents: number;
  operator: string;
  note: string;
  movements: CashMovement[];
}

export interface LocalOrder {
  id: string;
  number: string;
  channel: string;
  status: 'em preparo' | 'entregue';
  totalCents: number;
  openedAt: string;
  items: { name: string; quantity: number; totalCents: number }[];
}

export interface DemoProfile {
  id: string;
  name: string;
  firstName: string;
  role: string;
  initials: string;
  email: string;
  phone: string;
  shift: string;
}

interface DemoState {
  tables: LiveTable[];
  lines: OrderLine[];
  discountPercent: number;
  tickets: LiveTicket[];
  availability: Record<string, boolean>;
  cash: CashSession | null;
  localOrders: LocalOrder[];
  activeTableId: string | null;
  extraStaff: StaffMember[];
  readNotificationIds: string[];
  orderSequence: number;
  profile: DemoProfile;
}

function createState(): DemoState {
  const now = Date.now();
  return {
    tables: diningTables.map((table) => ({
      id: table.id,
      number: table.number,
      seats: table.seats,
      status: table.status,
      guests: table.guests,
      billCents: table.billCents,
      openedAt: table.openedMinutesAgo === null ? null : minutesAgoIso(table.openedMinutesAgo, now),
      area: table.area,
      x: table.x,
      y: table.y,
    })),
    lines: [],
    discountPercent: 0,
    tickets: kitchenSeeds.map((seed) => ({
      id: seed.id,
      number: seed.number,
      origin: seed.origin,
      status: seed.status,
      priority: seed.priority,
      createdAt: minutesAgoIso(seed.minutesAgo, now),
      items: seed.items,
    })),
    availability: Object.fromEntries(products.map((product) => [product.id, product.available])),
    cash: null,
    localOrders: [],
    activeTableId: null,
    extraStaff: [],
    readNotificationIds: [],
    orderSequence: 1049,
    profile: { ...currentUser },
  };
}

let state = createState();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function update(recipe: (current: DemoState) => DemoState) {
  state = recipe(state);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDemoState() {
  return state;
}

export function useDemoSession() {
  return useSyncExternalStore(subscribe, getDemoState, getDemoState);
}

export function resetDemoSession() {
  state = createState();
  emit();
}

export function selectOrderTotals(current: Pick<DemoState, 'lines' | 'discountPercent'>) {
  const subtotalCents = orderSubtotalCents(current.lines);
  const discountCents = orderDiscountCents(subtotalCents, current.discountPercent);
  return {
    subtotalCents,
    discountCents,
    totalCents: orderTotalCents(subtotalCents, discountCents),
  };
}

export const demoSession = {
  addProduct(product: { id: string; name: string; priceCents: number }) {
    if (state.availability[product.id] === false) return false;
    update((current) => {
      const existing = current.lines.find((line) => line.name === product.name && !line.detail);
      if (existing) {
        return {
          ...current,
          lines: current.lines.map((line) =>
            line.id === existing.id ? { ...line, quantity: line.quantity + 1 } : line,
          ),
        };
      }
      return {
        ...current,
        lines: [
          ...current.lines,
          {
            id: crypto.randomUUID(),
            name: product.name,
            quantity: 1,
            unitPriceCents: product.priceCents,
          },
        ],
      };
    });
    return true;
  },
  addConfiguredItem(input: {
    name: string;
    detail?: string;
    unitPriceCents: number;
    notes?: string;
  }) {
    update((current) => ({
      ...current,
      lines: [
        ...current.lines,
        {
          id: crypto.randomUUID(),
          name: input.name,
          detail: input.detail,
          quantity: 1,
          unitPriceCents: input.unitPriceCents,
          notes: input.notes,
        },
      ],
    }));
  },
  setQuantity(lineId: string, quantity: number) {
    update((current) => ({
      ...current,
      lines:
        quantity <= 0
          ? current.lines.filter((line) => line.id !== lineId)
          : current.lines.map((line) => (line.id === lineId ? { ...line, quantity } : line)),
    }));
  },
  removeLine(lineId: string) {
    update((current) => ({
      ...current,
      lines: current.lines.filter((line) => line.id !== lineId),
    }));
  },
  setDiscount(enabled: boolean) {
    update((current) => ({ ...current, discountPercent: enabled ? 10 : 0 }));
  },
  clearOrder() {
    update((current) => ({ ...current, lines: [], discountPercent: 0 }));
  },
  selectTable(tableId: string | null) {
    update((current) => ({ ...current, activeTableId: tableId }));
  },
  openTable(tableId: string, guests: number) {
    update((current) => ({
      ...current,
      activeTableId: tableId,
      tables: current.tables.map((table) =>
        table.id === tableId && (table.status === 'available' || table.status === 'reserved')
          ? {
              ...table,
              status: 'occupied',
              guests: Math.max(1, guests),
              openedAt: new Date().toISOString(),
            }
          : table,
      ),
    }));
  },
  requestBill(tableId: string) {
    update((current) => ({
      ...current,
      tables: current.tables.map((table) =>
        table.id === tableId && table.status === 'occupied'
          ? { ...table, status: 'awaiting_bill' }
          : table,
      ),
    }));
  },
  sendToKitchen() {
    if (state.lines.length === 0) return null;
    const totals = selectOrderTotals(state);
    const table = state.tables.find((item) => item.id === state.activeTableId);
    const origin = table ? `Mesa ${String(table.number).padStart(2, '0')}` : 'Balcão';
    const number = String(state.orderSequence);
    const openedAt = new Date().toISOString();
    const items = state.lines.map((line) => ({
      name: line.detail ? `${line.name} · ${line.detail}` : line.name,
      quantity: line.quantity,
      notes: line.notes,
    }));
    const order: LocalOrder = {
      id: crypto.randomUUID(),
      number,
      channel: origin,
      status: 'em preparo',
      totalCents: totals.totalCents,
      openedAt,
      items: state.lines.map((line) => ({
        name: line.name,
        quantity: line.quantity,
        totalCents: line.unitPriceCents * line.quantity,
      })),
    };
    update((current) => ({
      ...current,
      orderSequence: current.orderSequence + 1,
      lines: [],
      discountPercent: 0,
      localOrders: [order, ...current.localOrders],
      tickets: [
        {
          id: crypto.randomUUID(),
          number,
          origin,
          status: 'waiting',
          priority: 'normal',
          createdAt: openedAt,
          items,
        },
        ...current.tickets,
      ],
      tables: current.tables.map((item) =>
        item.id === current.activeTableId
          ? {
              ...item,
              status: item.status === 'available' ? 'occupied' : item.status,
              guests: item.guests || 2,
              openedAt: item.openedAt ?? openedAt,
              billCents: item.billCents + totals.totalCents,
            }
          : item,
      ),
    }));
    return order;
  },
  advanceTicket(ticketId: string) {
    const ticket = state.tickets.find((item) => item.id === ticketId);
    if (!ticket) return false;
    const next = nextKitchenStatus(ticket.status);
    if (!next) return false;
    update((current) => ({
      ...current,
      tickets: current.tickets.map((item) =>
        item.id === ticketId ? { ...item, status: next } : item,
      ),
    }));
    return true;
  },
  setProductAvailable(productId: string, available: boolean) {
    update((current) => ({
      ...current,
      availability: { ...current.availability, [productId]: available },
    }));
  },
  openCash(input: { openingFloatCents: number; operator: string; note: string }) {
    if (state.cash) return false;
    const openedAt = new Date().toISOString();
    update((current) => ({
      ...current,
      cash: {
        openedAt,
        openingFloatCents: input.openingFloatCents,
        operator: input.operator,
        note: input.note,
        movements: [
          {
            id: crypto.randomUUID(),
            type: 'opening',
            label: 'Fundo de troco',
            amountCents: input.openingFloatCents,
            method: 'cash',
            at: openedAt,
          },
        ],
      },
    }));
    return true;
  },
  registerPayment(input: { amountCents: number; method: PaymentMethod; label: string }) {
    if (!state.cash || input.amountCents <= 0) return false;
    update((current) => {
      if (!current.cash) return current;
      return {
        ...current,
        cash: {
          ...current.cash,
          movements: [
            {
              id: crypto.randomUUID(),
              type: 'sale',
              label: input.label,
              amountCents: input.amountCents,
              method: input.method,
              at: new Date().toISOString(),
            },
            ...current.cash.movements,
          ],
        },
      };
    });
    return true;
  },
  addCashMovement(input: { type: 'in' | 'out'; amountCents: number; label: string }) {
    if (!state.cash || input.amountCents <= 0) return false;
    update((current) => {
      if (!current.cash) return current;
      return {
        ...current,
        cash: {
          ...current.cash,
          movements: [
            {
              id: crypto.randomUUID(),
              type: input.type,
              label: input.label,
              amountCents: input.amountCents,
              method: 'cash',
              at: new Date().toISOString(),
            },
            ...current.cash.movements,
          ],
        },
      };
    });
    return true;
  },
  closeCash() {
    if (!state.cash) return null;
    const closed = state.cash;
    update((current) => ({ ...current, cash: null }));
    return closed;
  },
  addStaff(member: StaffMember) {
    update((current) => ({ ...current, extraStaff: [...current.extraStaff, member] }));
  },
  updateProfile(input: { name: string; email: string; phone: string; shift: string }) {
    const parts = input.name.trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] ?? input.name.trim();
    const initials = parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
    update((current) => ({
      ...current,
      profile: {
        ...current.profile,
        name: input.name.trim(),
        firstName,
        initials,
        email: input.email.trim(),
        phone: input.phone.trim(),
        shift: input.shift,
      },
    }));
  },
  markNotificationRead(id: string) {
    update((current) => ({
      ...current,
      readNotificationIds: current.readNotificationIds.includes(id)
        ? current.readNotificationIds
        : [...current.readNotificationIds, id],
    }));
  },
  staffList() {
    return [...staff, ...state.extraStaff];
  },
};
