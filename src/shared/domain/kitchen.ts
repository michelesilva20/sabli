export type KitchenStatus = 'waiting' | 'preparing' | 'ready' | 'delivered';

export const KITCHEN_FLOW: KitchenStatus[] = ['waiting', 'preparing', 'ready', 'delivered'];

export const NEXT_KITCHEN_STATUS: Record<KitchenStatus, KitchenStatus | null> = {
  waiting: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
  delivered: null,
};

export const KITCHEN_STATUS_LABEL: Record<KitchenStatus, string> = {
  waiting: 'Aguardando',
  preparing: 'Em preparo',
  ready: 'Prontos',
  delivered: 'Entregues',
};

export const KITCHEN_ITEM_STATUS_LABEL: Record<KitchenStatus, string> = {
  waiting: 'Aguardando',
  preparing: 'Em preparo',
  ready: 'Pronto',
  delivered: 'Entregue',
};

export const KITCHEN_ACTION_LABEL: Record<KitchenStatus, string | null> = {
  waiting: 'Iniciar preparo',
  preparing: 'Marcar pronto',
  ready: 'Entregar',
  delivered: null,
};

export function nextKitchenStatus(status: KitchenStatus): KitchenStatus | null {
  return NEXT_KITCHEN_STATUS[status];
}

export function applyKitchenTransition(
  current: KitchenStatus,
  attempted: KitchenStatus,
): KitchenStatus | null {
  return NEXT_KITCHEN_STATUS[current] === attempted ? attempted : null;
}

export function itemKitchenStatus(
  item: { status?: KitchenStatus },
  ticketStatus: KitchenStatus,
): KitchenStatus {
  return item.status ?? ticketStatus;
}

export function aggregateKitchenStatus(statuses: readonly KitchenStatus[]): KitchenStatus {
  if (statuses.length === 0) return 'waiting';
  if (statuses.every((status) => status === 'waiting')) return 'waiting';
  if (statuses.every((status) => status === 'delivered')) return 'delivered';
  if (statuses.every((status) => status === 'ready' || status === 'delivered')) return 'ready';
  return 'preparing';
}

export function kitchenStatusToOrderStatus(
  status: KitchenStatus,
): 'aberto' | 'em preparo' | 'pronto' | 'entregue' {
  if (status === 'waiting') return 'aberto';
  if (status === 'preparing') return 'em preparo';
  if (status === 'ready') return 'pronto';
  return 'entregue';
}
