import type { ReactNode } from 'react';
import { useUiStore } from '@/app/stores/ui-store';
import { ApiUnavailableState } from '@/features/auth/api-unavailable-state';
import { Button } from '@/design-system/components/button';
import { EmptyState } from '@/design-system/components/feedback';
import { isApiMode } from '@/shared/config/runtime';
import type { ModuleId } from '@/shared/types/domain';

const apiReady: ModuleId[] = [
  'home',
  'settings',
  'products',
  'pos',
  'tables',
  'orders',
  'kitchen',
  'checks',
  'cash',
];

export function ModuleGate({ module, children }: { module: ModuleId; children: ReactNode }) {
  const enabled = useUiStore((state) => state.enabledModules.includes(module));
  const toggle = useUiStore((state) => state.toggleModule);
  if (isApiMode() && !apiReady.includes(module)) {
    return <ApiUnavailableState module={module} />;
  }
  if (enabled) return children;
  return (
    <EmptyState
      title="Módulo oculto nesta demonstração"
      description="A navegação pode esconder módulos para simular um plano. Isso não é controle de acesso nem segurança."
      action={<Button onClick={() => toggle(module)}>Mostrar módulo de novo</Button>}
    />
  );
}
