import { Store } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@/design-system/components/button';
import { Card, CardContent } from '@/design-system/components/card';
import { EmptyState } from '@/design-system/components/feedback';
import { PageHeader } from '@/design-system/components/navigation';
import { firstNameFrom, roleLabel, useAuthSession } from '@/shared/auth/session';
import { greetingFor } from '@/shared/domain/date';

export function ApiHomePage() {
  const session = useAuthSession();
  const navigate = useNavigate();
  const place = session.context?.establishment;
  const user = session.me?.user;

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Início"
        description={`${greetingFor()}, ${firstNameFrom(user?.name)}. Você está no contexto autorizado de ${place?.name ?? 'um estabelecimento'}.`}
      />
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-[14px] bg-primary-action text-primary-action-foreground">
              <Store className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-bold text-muted-foreground">{session.context?.organization.name}</p>
              <p className="text-lg font-extrabold">{place?.name}</p>
              <p className="text-xs font-semibold text-muted-foreground">{roleLabel(session.context, session.me)}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/selecionar-estabelecimento')}>
            Trocar estabelecimento
          </Button>
        </CardContent>
      </Card>
      <EmptyState
        title="Operação ainda não conectada neste modo"
        description="Login, sessão e contexto já usam a API. Catálogo, mesas, pedidos, cozinha, comandas e caixa continuam só na demonstração. Esta tela não mostra fixtures como se fossem dados reais."
      />
    </div>
  );
}
