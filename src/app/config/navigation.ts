import {
  ChartColumn,
  ChefHat,
  ClipboardList,
  LayoutDashboard,
  LayoutGrid,
  Pizza,
  Receipt,
  Settings,
  ShoppingBag,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { ModuleId } from '@/shared/types/domain';

export interface NavItem {
  id: ModuleId;
  label: string;
  to: string;
  icon: LucideIcon;
}

export const businessNavigation: NavItem[] = [
  { id: 'home', label: 'Início', to: '/inicio', icon: LayoutDashboard },
  { id: 'tables', label: 'Mesas', to: '/mesas', icon: LayoutGrid },
  { id: 'orders', label: 'Pedidos', to: '/pedidos', icon: ClipboardList },
  { id: 'pos', label: 'PDV', to: '/pdv', icon: ShoppingBag },
  { id: 'checks', label: 'Comandas', to: '/comandas', icon: Receipt },
  { id: 'products', label: 'Produtos', to: '/produtos', icon: Pizza },
  { id: 'kitchen', label: 'Cozinha', to: '/cozinha', icon: ChefHat },
  { id: 'cash', label: 'Caixa', to: '/caixa', icon: Wallet },
  { id: 'reports', label: 'Relatórios', to: '/relatorios', icon: ChartColumn },
  { id: 'team', label: 'Equipe', to: '/equipe', icon: Users },
  { id: 'settings', label: 'Configurações', to: '/configuracoes', icon: Settings },
];
