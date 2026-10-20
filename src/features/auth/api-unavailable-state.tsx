import { PlugZap } from 'lucide-react';
import { EmptyState } from '@/design-system/components/feedback';
import { PageHeader } from '@/design-system/components/navigation';
import type { ModuleId } from '@/shared/types/domain';

const labels: Record<ModuleId, string> = {
  home: 'Início',
  tables: 'Mesas',
  orders: 'Pedidos',
  pos: 'PDV',
  checks: 'Comandas',
  products: 'Produtos',
  kitchen: 'Cozinha',
  cash: 'Caixa',
  reports: 'Relatórios',
  team: 'Equipe',
  settings: 'Configurações',
};

export function ApiUnavailableState({ module }: { module: ModuleId }) {
  return (
    <div className="grid gap-4">
      <PageHeader
        title={labels[module]}
        description="Este módulo ainda não consome a API neste checkpoint."
      />
      <EmptyState
        icon={<PlugZap className="size-8" aria-hidden />}
        title="Ainda não disponível no modo API"
        description="Autenticação, catálogo, mesas, pedidos, cozinha, comandas e caixa já vêm do servidor. Relatórios e equipe ainda não estão ligados neste modo."
      />
    </div>
  );
}
