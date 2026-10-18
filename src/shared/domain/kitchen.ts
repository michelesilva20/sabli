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

export const KITCHEN_ACTION_LABEL: Record<KitchenStatus, string | null> = {
  waiting: 'Iniciar preparo',
  preparing: 'Marcar pronto',
  ready: 'Entregar',
  delivered: null,
};

export function nextKitchenStatus(status: KitchenStatus): KitchenStatus | null {
  return NEXT_KITCHEN_STATUS[status];
}
