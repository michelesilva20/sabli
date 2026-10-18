import type { DashboardPeriod, DashboardSnapshot } from '@/shared/types/domain';
import {
  catalogOrders,
  categories,
  dashboards,
  diningTables,
  establishments,
  kitchenSeeds,
  notifications,
  pizzaCrusts,
  pizzaExtras,
  pizzaFlavors,
  products,
  staff,
} from '@/shared/mocks/fixtures';

const delayMs = import.meta.env.MODE === 'test' ? 0 : 180;

function wait<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), delayMs);
  });
}

export interface SabliDataSource {
  listEstablishments(): Promise<typeof establishments>;
  getDashboard(establishmentId: string, period: DashboardPeriod): Promise<DashboardSnapshot>;
  listTables(): Promise<typeof diningTables>;
  listCategories(): Promise<typeof categories>;
  listProducts(): Promise<typeof products>;
  listPizzaOptions(): Promise<{
    flavors: typeof pizzaFlavors;
    crusts: typeof pizzaCrusts;
    extras: typeof pizzaExtras;
  }>;
  listOrders(): Promise<typeof catalogOrders>;
  listKitchenSeeds(): Promise<typeof kitchenSeeds>;
  listStaff(): Promise<typeof staff>;
  listNotifications(): Promise<typeof notifications>;
}

export const mockDataSource: SabliDataSource = {
  listEstablishments: () => wait(establishments),
  getDashboard: (establishmentId, period) => {
    const pack = dashboards[establishmentId] ?? dashboards.est_centro;
    return wait(pack[period]);
  },
  listTables: () => wait(diningTables),
  listCategories: () => wait(categories),
  listProducts: () => wait(products),
  listPizzaOptions: () => wait({ flavors: pizzaFlavors, crusts: pizzaCrusts, extras: pizzaExtras }),
  listOrders: () => wait(catalogOrders),
  listKitchenSeeds: () => wait(kitchenSeeds),
  listStaff: () => wait(staff),
  listNotifications: () => wait(notifications),
};
