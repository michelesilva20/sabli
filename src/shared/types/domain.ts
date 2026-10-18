export type ModuleId =
  | 'home'
  | 'tables'
  | 'orders'
  | 'pos'
  | 'checks'
  | 'products'
  | 'kitchen'
  | 'cash'
  | 'reports'
  | 'team'
  | 'settings';

export type ThemePreference = 'light' | 'dark' | 'system';

export type TableStatus = 'available' | 'occupied' | 'awaiting_bill' | 'reserved' | 'unavailable';

export type ProductArt = 'pizza' | 'drink' | 'starter' | 'dessert' | 'combo';

export type PaymentMethod = 'pix' | 'credit' | 'debit' | 'cash' | 'voucher';

export type DashboardPeriod = 'today' | 'yesterday' | 'week' | 'month';

export interface Establishment {
  id: string;
  name: string;
  city: string;
  phone: string;
  segment: 'pizzaria';
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  shift: string;
  initials: string;
}

export interface DiningTable {
  id: string;
  number: number;
  seats: number;
  status: TableStatus;
  guests: number;
  billCents: number;
  openedMinutesAgo: number | null;
  area: string;
  x: number;
  y: number;
}

export interface ProductCategory {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  priceCents: number;
  available: boolean;
  art: ProductArt;
  accent: string;
  image: string;
}

export interface PizzaFlavor {
  id: string;
  name: string;
  description: string;
  grandePriceCents: number;
}

export interface PizzaCrust {
  id: string;
  name: string;
  priceCents: number;
}

export interface PizzaExtra {
  id: string;
  name: string;
  priceCents: number;
}

export interface SalesPoint {
  hour: string;
  totalCents: number;
}

export interface PaymentSlice {
  method: string;
  percent: number;
  totalCents: number;
  color: string;
}

export interface RecentOrder {
  id: string;
  number: string;
  channel: string;
  totalCents: number;
  status: string;
  time: string;
}

export interface DashboardSnapshot {
  period: DashboardPeriod;
  revenueCents: number;
  revenueDelta: number;
  salesCount: number;
  salesDelta: number;
  averageTicketCents: number;
  averageTicketDelta: number;
  occupiedTables: number;
  totalTables: number;
  salesByHour: SalesPoint[];
  payments: PaymentSlice[];
  recentOrders: RecentOrder[];
}

export interface CatalogOrder {
  id: string;
  number: string;
  channel: string;
  status: 'aberto' | 'em preparo' | 'pronto' | 'entregue' | 'cancelado';
  totalCents: number;
  openedAt: string;
  items: { name: string; quantity: number; totalCents: number }[];
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
}
