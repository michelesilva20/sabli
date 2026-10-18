import { Navigate, createBrowserRouter } from 'react-router';
import { BusinessLayout } from '@/app/layouts/business-layout';
import { KitchenLayout } from '@/app/layouts/kitchen-layout';
import { ModuleGate } from '@/app/layouts/module-gate';
import { WaiterLayout } from '@/app/layouts/waiter-layout';
import { CatalogPage } from '@/features/catalog/catalog-page';
import { CashPage } from '@/features/cash/cash-page';
import { DashboardPage } from '@/features/dashboard/dashboard-page';
import { DesignSystemPage } from '@/features/design-system/design-system-page';
import { DiningPage } from '@/features/dining/dining-page';
import { KitchenPage } from '@/features/kitchen/kitchen-page';
import { NotFoundPage } from '@/features/not-found-page';
import { ChecksPage } from '@/features/orders/checks-page';
import { OrdersPage } from '@/features/orders/orders-page';
import { PizzaBuilderPage } from '@/features/pizza-builder/pizza-builder';
import { PosPage } from '@/features/pos/pos-page';
import { ReportsPage } from '@/features/reports/reports-page';
import { ProfilePage } from '@/features/settings/profile-page';
import { SettingsPage } from '@/features/settings/settings-page';
import { TeamPage } from '@/features/settings/team-page';
import {
  WaiterBillPage,
  WaiterCatalogPage,
  WaiterCheckPage,
  WaiterPizzaPage,
  WaiterReviewPage,
  WaiterTablePage,
  WaiterTablesPage,
} from '@/features/waiter/waiter-pages';

export function createAppRoutes() {
  const designSystemRoute = import.meta.env.DEV
    ? [{ path: 'design-system', element: <DesignSystemPage /> }]
    : [];

  return [
    {
      path: '/',
      element: <BusinessLayout />,
      children: [
        { index: true, element: <Navigate to="/inicio" replace /> },
        {
          path: 'inicio',
          element: (
            <ModuleGate module="home">
              <DashboardPage />
            </ModuleGate>
          ),
        },
        {
          path: 'mesas',
          element: (
            <ModuleGate module="tables">
              <DiningPage />
            </ModuleGate>
          ),
        },
        {
          path: 'pedidos',
          element: (
            <ModuleGate module="orders">
              <OrdersPage />
            </ModuleGate>
          ),
        },
        {
          path: 'pdv',
          element: (
            <ModuleGate module="pos">
              <PosPage />
            </ModuleGate>
          ),
        },
        {
          path: 'pdv/montar-pizza',
          element: (
            <ModuleGate module="pos">
              <PizzaBuilderPage />
            </ModuleGate>
          ),
        },
        {
          path: 'comandas',
          element: (
            <ModuleGate module="checks">
              <ChecksPage />
            </ModuleGate>
          ),
        },
        {
          path: 'produtos',
          element: (
            <ModuleGate module="products">
              <CatalogPage />
            </ModuleGate>
          ),
        },
        {
          path: 'caixa',
          element: (
            <ModuleGate module="cash">
              <CashPage />
            </ModuleGate>
          ),
        },
        {
          path: 'relatorios',
          element: (
            <ModuleGate module="reports">
              <ReportsPage />
            </ModuleGate>
          ),
        },
        {
          path: 'equipe',
          element: (
            <ModuleGate module="team">
              <TeamPage />
            </ModuleGate>
          ),
        },
        {
          path: 'configuracoes',
          element: (
            <ModuleGate module="settings">
              <SettingsPage />
            </ModuleGate>
          ),
        },
        { path: 'perfil', element: <ProfilePage /> },
        ...designSystemRoute,
        { path: '*', element: <NotFoundPage /> },
      ],
    },
    {
      path: '/cozinha',
      element: <KitchenLayout />,
      children: [{ index: true, element: <KitchenPage /> }],
    },
    {
      path: '/atendimento',
      element: <WaiterLayout />,
      children: [
        { index: true, element: <Navigate to="/atendimento/mesas" replace /> },
        { path: 'mesas', element: <WaiterTablesPage /> },
        { path: 'mesas/:tableId', element: <WaiterTablePage /> },
        { path: 'comanda', element: <WaiterCheckPage /> },
        { path: 'cardapio', element: <WaiterCatalogPage /> },
        { path: 'montar-pizza', element: <WaiterPizzaPage /> },
        { path: 'revisao', element: <WaiterReviewPage /> },
        { path: 'conta', element: <WaiterBillPage /> },
      ],
    },
  ];
}

export const router = createBrowserRouter(createAppRoutes());
