import { useMutation, useQuery } from '@tanstack/react-query';
import {
  addCashMovement,
  closeCashSession,
  getCurrentCashSession,
  openCashSession,
} from '@/shared/api/cash';
import { invalidateFinance } from '@/shared/api/billing-queries';
import { ApiError } from '@/shared/api/http-client';
import { appQueryClient } from '@/shared/api/query-client';
import { useAuthSession } from '@/shared/auth/session';

export function cashKeys(establishmentId: string) {
  return {
    all: ['cash', establishmentId] as const,
    current: ['cash', establishmentId, 'current'] as const,
  };
}

function useEstablishmentId() {
  return useAuthSession().context?.establishment?.id;
}

export function invalidateCash(establishmentId: string) {
  return appQueryClient.invalidateQueries({ queryKey: cashKeys(establishmentId).all });
}

export function useCurrentCashQuery(enabled = true) {
  const establishmentId = useEstablishmentId();
  return useQuery({
    queryKey: cashKeys(establishmentId ?? '').current,
    queryFn: () => getCurrentCashSession(establishmentId!),
    enabled: Boolean(establishmentId) && enabled,
    staleTime: 4_000,
    refetchInterval: 8_000,
    refetchIntervalInBackground: false,
  });
}

function guardEstablishment(current: string | undefined, expected: string) {
  if (!current || current !== expected) {
    throw new ApiError(
      409,
      'CONTEXT_CHANGED',
      'Contexto alterado',
      'O estabelecimento mudou. A operação anterior foi cancelada.',
    );
  }
}

export function useOpenCashMutation() {
  const establishmentId = useEstablishmentId();
  return useMutation({
    mutationFn: (input: { establishmentId: string; openingFloatCents: number; notes?: string }) => {
      guardEstablishment(establishmentId, input.establishmentId);
      return openCashSession(input.establishmentId, {
        openingFloatCents: input.openingFloatCents,
        notes: input.notes,
      });
    },
    onSuccess: (_session, input) => invalidateFinance(input.establishmentId),
  });
}

export function useCashMovementMutation() {
  const establishmentId = useEstablishmentId();
  return useMutation({
    mutationFn: (input: {
      establishmentId: string;
      sessionId: string;
      type: 'SUPPLY' | 'BLEED';
      amountCents: number;
      notes?: string;
    }) => {
      guardEstablishment(establishmentId, input.establishmentId);
      return addCashMovement(input.establishmentId, input.sessionId, {
        type: input.type,
        amountCents: input.amountCents,
        notes: input.notes,
      });
    },
    onSuccess: (_session, input) => invalidateFinance(input.establishmentId),
  });
}

export function useCloseCashMutation() {
  const establishmentId = useEstablishmentId();
  return useMutation({
    mutationFn: (input: { establishmentId: string; sessionId: string; version?: number }) => {
      guardEstablishment(establishmentId, input.establishmentId);
      return closeCashSession(input.establishmentId, input.sessionId, { version: input.version });
    },
    onSuccess: (_session, input) => invalidateFinance(input.establishmentId),
  });
}
