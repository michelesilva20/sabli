import { useEffect, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { SessionRestoreScreen } from '@/features/auth/session-restore';
import { Alert } from '@/design-system/components/feedback';
import { Button } from '@/design-system/components/button';
import { bootstrapSession, logout, useAuthSession } from '@/shared/auth/session';
import { isApiMode, isDemoMode } from '@/shared/config/runtime';

export function SessionBootstrap({ children }: { children: ReactNode }) {
  const session = useAuthSession();

  useEffect(() => {
    void bootstrapSession();
  }, []);

  if (isApiMode() && (session.status === 'boot' || session.status === 'restoring')) {
    return <SessionRestoreScreen />;
  }
  return children;
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const session = useAuthSession();
  if (isDemoMode()) return <Navigate to="/inicio" replace />;
  if (session.status === 'authenticated' && session.context?.establishment) {
    return <Navigate to="/inicio" replace />;
  }
  if (session.status === 'authenticated') {
    return <Navigate to="/selecionar-estabelecimento" replace />;
  }
  return children;
}

export function RequireAuth() {
  const session = useAuthSession();
  const location = useLocation();
  if (isDemoMode()) return <Outlet />;
  if (session.status === 'boot' || session.status === 'restoring') {
    return <SessionRestoreScreen />;
  }
  if (session.status === 'expired') {
    return <Navigate to="/entrar" replace state={{ from: location, reason: 'expired' }} />;
  }
  if (session.status !== 'authenticated') {
    return <Navigate to="/entrar" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

export function RequireEstablishment() {
  const session = useAuthSession();
  if (isDemoMode()) return <Outlet />;
  if (!session.context?.establishment) {
    return <Navigate to="/selecionar-estabelecimento" replace />;
  }
  return <Outlet />;
}

export function ApiServiceDown({
  onRetry,
}: {
  onRetry?: () => void;
}) {
  return (
    <div className="mx-auto grid max-w-lg gap-4 px-6 py-16">
      <Alert title="API indisponível" tone="danger">
        O frontend não usa os dados da demonstração como fallback.
      </Alert>
      {onRetry ? (
        <Button onClick={onRetry} variant="outline">
          Tentar de novo
        </Button>
      ) : null}
    </div>
  );
}

export function LogoutOnDemand() {
  return (
    <Button
      variant="outline"
      onClick={() => {
        void logout();
      }}
    >
      Sair
    </Button>
  );
}
