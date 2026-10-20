import { useSyncExternalStore } from 'react';
import { z } from 'zod';
import {
  contextResponseSchema,
  meResponseSchema,
  tokenResponseSchema,
  type ContextResponse,
  type MeResponse,
} from '@/shared/api/contracts';
import { ApiError, ApiUnavailableError, apiRequest, registerAccessRefresh } from '@/shared/api/http-client';
import { appQueryClient } from '@/shared/api/query-client';
import { isApiMode } from '@/shared/config/runtime';
import { readAccessToken, writeAccessToken } from '@/shared/auth/token-memory';
import { resetPaymentAttempts } from '@/shared/billing/payment-attempt';
import { resetOrderDraft } from '@/shared/orders/order-draft';

export type AuthStatus = 'boot' | 'restoring' | 'anonymous' | 'authenticated' | 'expired';

export interface AuthSnapshot {
  status: AuthStatus;
  me: MeResponse | null;
  context: ContextResponse | null;
  lastError: { code: string; message: string } | null;
  unavailable: boolean;
}

const listeners = new Set<() => void>();

function initialSnapshot(): AuthSnapshot {
  return {
    status: isApiMode() ? 'boot' : 'anonymous',
    me: null,
    context: null,
    lastError: null,
    unavailable: false,
  };
}

let snapshot: AuthSnapshot = initialSnapshot();

function emit(next: AuthSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAuthSnapshot(): AuthSnapshot {
  return snapshot;
}

export function useAuthSession(): AuthSnapshot {
  return useSyncExternalStore(subscribe, getAuthSnapshot, getAuthSnapshot);
}

export function resetAuthSession(): void {
  writeAccessToken(null);
  emit(initialSnapshot());
}

export function installSessionRefresh(): void {
  registerAccessRefresh(async () => {
    if (!isApiMode()) return null;
    try {
      const tokens = await apiRequest(tokenResponseSchema, {
        path: '/auth/refresh',
        method: 'POST',
        auth: false,
      });
      writeAccessToken(tokens.accessToken);
      return tokens.accessToken;
    } catch {
      writeAccessToken(null);
      if (snapshot.status === 'authenticated') {
        emit({
          ...snapshot,
          status: 'expired',
          me: null,
          context: null,
          lastError: { code: 'UNAUTHENTICATED', message: 'A sessão expirou.' },
        });
      }
      return null;
    }
  });
}

installSessionRefresh();

export async function bootstrapSession(): Promise<void> {
  if (!isApiMode()) {
    emit({ ...initialSnapshot(), status: 'anonymous' });
    return;
  }
  if (snapshot.status === 'authenticated' && readAccessToken()) {
    return;
  }
  emit({ ...snapshot, status: 'restoring', unavailable: false, lastError: null });
  try {
    const tokens = await apiRequest(tokenResponseSchema, {
      path: '/auth/refresh',
      method: 'POST',
      auth: false,
      timeoutMs: 5_000,
    });
    writeAccessToken(tokens.accessToken);
    const me = await apiRequest(meResponseSchema, { path: '/me' });
    const context = await hydrateRememberedContext(me);
    emit({
      status: 'authenticated',
      me,
      context,
      lastError: null,
      unavailable: false,
    });
  } catch (error) {
    writeAccessToken(null);
    if (error instanceof ApiUnavailableError) {
      emit({
        status: 'anonymous',
        me: null,
        context: null,
        lastError: { code: error.code, message: error.message },
        unavailable: true,
      });
      return;
    }
    emit({ ...initialSnapshot(), status: 'anonymous' });
  }
}

export async function login(email: string, password: string): Promise<MeResponse> {
  try {
    const tokens = await apiRequest(tokenResponseSchema, {
      path: '/auth/login',
      method: 'POST',
      auth: false,
      body: { email, password },
    });
    writeAccessToken(tokens.accessToken);
    const me = await apiRequest(meResponseSchema, { path: '/me' });
    const context = await hydrateRememberedContext(me);
    emit({
      status: 'authenticated',
      me,
      context,
      lastError: null,
      unavailable: false,
    });
    return me;
  } catch (error) {
    writeAccessToken(null);
    if (error instanceof ApiUnavailableError) {
      emit({
        status: 'anonymous',
        me: null,
        context: null,
        lastError: { code: error.code, message: 'O serviço de autenticação está indisponível.' },
        unavailable: true,
      });
      throw error;
    }
    const failed = new ApiError(
      error instanceof ApiError ? error.status : 401,
      error instanceof ApiError ? error.code : 'INVALID_CREDENTIALS',
      'Credenciais inválidas',
      'Não foi possível entrar. Verifique o e-mail e a senha.',
    );
    emit({
      status: 'anonymous',
      me: null,
      context: null,
      lastError: { code: failed.code, message: failed.message },
      unavailable: false,
    });
    throw failed;
  }
}

export async function logout(): Promise<void> {
  try {
    await apiRequest(z.undefined(), {
      path: '/auth/logout',
      method: 'POST',
      auth: false,
    });
  } catch {
    // A sessão local é encerrada mesmo se a revogação remota falhar.
  } finally {
    writeAccessToken(null);
    resetOrderDraft();
    resetPaymentAttempts();
    appQueryClient.clear();
    emit({ ...initialSnapshot(), status: 'anonymous' });
  }
}

export async function selectEstablishment(
  organizationId: string,
  establishmentId: string,
): Promise<ContextResponse> {
  try {
    const context = await apiRequest(contextResponseSchema, {
      path: '/me/context',
      method: 'POST',
      body: { organizationId, establishmentId },
    });
    if (!context.establishment) {
      throw new ApiError(403, 'FORBIDDEN', 'Acesso negado', 'Selecione um estabelecimento autorizado.');
    }
    await appQueryClient.cancelQueries();
    appQueryClient.clear();
    resetPaymentAttempts();
    emit({
      ...snapshot,
      context,
      lastError: null,
      unavailable: false,
    });
    return context;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      writeAccessToken(null);
      emit({
        status: 'expired',
        me: null,
        context: null,
        lastError: { code: 'UNAUTHENTICATED', message: 'A sessão expirou.' },
        unavailable: false,
      });
    }
    throw error;
  }
}

export async function forgetRememberedContext(): Promise<void> {
  try {
    await apiRequest(z.undefined(), {
      path: '/me/context',
      method: 'DELETE',
    });
  } catch {
    // A invalidação local segue mesmo se o servidor já tiver esquecido o contexto.
  }
}

async function hydrateRememberedContext(me: MeResponse): Promise<ContextResponse | null> {
  try {
    return await restoreRememberedContext(me);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw error;
    return null;
  }
}

async function restoreRememberedContext(me: MeResponse): Promise<ContextResponse | null> {
  if (!me.lastOrganizationId || !me.lastEstablishmentId) {
    return null;
  }
  try {
    const context = await apiRequest(contextResponseSchema, {
      path: '/me/context',
      method: 'POST',
      body: { organizationId: me.lastOrganizationId, establishmentId: me.lastEstablishmentId },
    });
    if (!context.establishment) {
      await forgetRememberedContext();
      await appQueryClient.cancelQueries();
      appQueryClient.clear();
      return null;
    }
    return context;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
      await forgetRememberedContext();
      await appQueryClient.cancelQueries();
      appQueryClient.clear();
      return null;
    }
    throw error;
  }
}

export function clearEstablishmentContext(): void {
  void appQueryClient.cancelQueries();
  appQueryClient.clear();
  emit({ ...snapshot, context: null });
}

export function canManageCatalog(context: ContextResponse | null): boolean {
  const roles = [context?.establishmentRole, context?.organizationRole];
  return roles.some((role) => role === 'ADMIN' || role === 'MANAGER');
}

export function canManageDining(context: ContextResponse | null): boolean {
  return canManageCatalog(context);
}

export function canOperateDining(context: ContextResponse | null): boolean {
  if (canManageDining(context)) return true;
  const role = context?.establishmentRole;
  return role === 'CASHIER' || role === 'WAITER';
}

export function canPlaceOrder(context: ContextResponse | null): boolean {
  return canOperateDining(context);
}

export function canAdvanceKitchen(context: ContextResponse | null): boolean {
  if (canManageDining(context)) return true;
  return context?.establishmentRole === 'KITCHEN';
}

export function canReadBill(context: ContextResponse | null): boolean {
  return canOperateDining(context);
}

export function canFinance(context: ContextResponse | null): boolean {
  if (canManageDining(context)) return true;
  return context?.establishmentRole === 'CASHIER';
}

export function canCloseSettledTable(context: ContextResponse | null): boolean {
  return canOperateDining(context);
}

export function firstNameFrom(name: string | undefined): string {
  if (!name) return 'por aí';
  return name.trim().split(/\s+/)[0] ?? name;
}

export function initialsFrom(name: string | undefined): string {
  if (!name) return 'SA';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'SA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function roleLabel(context: ContextResponse | null, me: MeResponse | null): string {
  const role = context?.establishmentRole ?? context?.organizationRole;
  if (role === 'ADMIN') return 'Administrador';
  if (role === 'MANAGER') return 'Gerente';
  if (role === 'CASHIER') return 'Caixa';
  if (role === 'WAITER') return 'Garçom';
  if (role === 'KITCHEN') return 'Cozinha';
  if (me?.organizationMemberships[0]?.role === 'ADMIN') return 'Administrador';
  return 'Operação';
}

