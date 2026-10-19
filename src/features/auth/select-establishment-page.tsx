import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert } from '@/design-system/components/feedback';
import { Button } from '@/design-system/components/button';
import { Card, CardContent } from '@/design-system/components/card';
import { EmptyState } from '@/design-system/components/feedback';
import { ThemeSwitcher } from '@/design-system/components/theme-switcher';
import { SabliLogo } from '@/design-system/icons/logo';
import { Dialog } from '@/design-system/components/dialog';
import { ApiError } from '@/shared/api/http-client';
import {
  logout,
  selectEstablishment,
  useAuthSession,
} from '@/shared/auth/session';
import { draftBlocksEstablishmentSwitch, resetOrderDraft } from '@/shared/orders/order-draft';

export function SelectEstablishmentPage() {
  const navigate = useNavigate();
  const session = useAuthSession();
  const me = session.me;
  const [organizationId, setOrganizationId] = useState(
    me?.organizations[0]?.id ?? me?.establishments[0]?.organizationId ?? '',
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingSwitch, setPendingSwitch] = useState<{
    organizationId: string;
    id: string;
  } | null>(null);

  const establishments = useMemo(() => {
    const all = me?.establishments ?? [];
    if (!organizationId) return all;
    return all.filter((item) => item.organizationId === organizationId);
  }, [me?.establishments, organizationId]);

  async function enterEstablishment(organizationIdValue: string, establishmentId: string, discardDraft = false) {
    if (discardDraft) resetOrderDraft();
    setPendingId(establishmentId);
    setError(null);
    try {
      await selectEstablishment(organizationIdValue, establishmentId);
      navigate('/inicio', { replace: true });
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'TENANT_SUSPENDED') {
        setError('Este estabelecimento está suspenso.');
      } else if (cause instanceof ApiError && cause.status === 403) {
        setError('Você não tem permissão para este estabelecimento.');
      } else if (cause instanceof ApiError && cause.status === 404) {
        setError('Este estabelecimento não está disponível para a sua conta.');
      } else if (cause instanceof ApiError && cause.status === 401) {
        navigate('/entrar', { replace: true, state: { reason: 'expired' } });
      } else {
        setError('Não foi possível validar o estabelecimento.');
      }
    } finally {
      setPendingId(null);
      setPendingSwitch(null);
    }
  }

  if (!me) {
    return null;
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4 py-8 text-foreground">
      <div className="absolute top-4 right-4 flex items-center gap-2 sm:top-6 sm:right-6">
        <ThemeSwitcher compact />
        <Button variant="ghost" onClick={() => void logout()}>
          Sair
        </Button>
      </div>
      <div className="grid w-full max-w-2xl gap-6">
        <SabliLogo />
        <div className="grid gap-1">
          <h1 className="text-3xl font-extrabold">Onde você vai operar?</h1>
          <p className="text-sm text-muted-foreground">
            O estabelecimento escolhido precisa ser autorizado pelo servidor. A troca limpa dados
            privados em memória.
          </p>
        </div>
        {error ? (
          <Alert title="Contexto recusado" tone="danger">
            {error}
          </Alert>
        ) : null}
        {me.organizations.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            {me.organizations.map((organization) => (
              <Button
                key={organization.id}
                variant={organization.id === organizationId ? 'secondary' : 'outline'}
                onClick={() => {
                  setOrganizationId(organization.id);
                  setError(null);
                }}
              >
                {organization.name}
              </Button>
            ))}
          </div>
        ) : null}
        {establishments.length === 0 ? (
          <EmptyState
            title="Nenhum estabelecimento disponível"
            description="Sua conta não tem membership ativa neste contexto. Peça acesso a um administrador."
          />
        ) : (
          <div className="grid gap-3">
            {establishments.map((establishment) => {
              const suspended = establishment.status !== 'ACTIVE';
              return (
                <Card key={establishment.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div>
                      <p className="font-extrabold">{establishment.name}</p>
                      <p className="text-xs font-semibold text-muted-foreground">
                        {suspended ? 'Suspenso' : 'Ativo'} · {establishment.slug}
                      </p>
                    </div>
                    <Button
                      disabled={suspended || pendingId !== null}
                      loading={pendingId === establishment.id}
                      onClick={() => {
                        if (draftBlocksEstablishmentSwitch(establishment.id)) {
                          setPendingSwitch({
                            organizationId: establishment.organizationId,
                            id: establishment.id,
                          });
                          return;
                        }
                        void enterEstablishment(establishment.organizationId, establishment.id);
                      }}
                    >
                      {suspended ? 'Indisponível' : 'Entrar'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <Dialog
        open={Boolean(pendingSwitch)}
        onOpenChange={(open) => {
          if (!open) setPendingSwitch(null);
        }}
        title="Descartar o rascunho?"
        description="Há itens não confirmados no estabelecimento atual."
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingSwitch(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!pendingSwitch) return;
                void enterEstablishment(pendingSwitch.organizationId, pendingSwitch.id, true);
              }}
            >
              Descartar e entrar
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">Cancelar mantém o rascunho e não troca o estabelecimento.</p>
      </Dialog>
    </div>
  );
}
