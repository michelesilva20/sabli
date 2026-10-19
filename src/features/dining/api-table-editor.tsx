import { useEffect, useState } from 'react';
import { Alert } from '@/design-system/components/feedback';
import { Button } from '@/design-system/components/button';
import { FormField } from '@/design-system/components/form-field';
import { Input } from '@/design-system/components/input';
import { Sheet } from '@/design-system/components/sheet';
import { pushToast } from '@/design-system/components/toast';
import {
  invalidateDining,
  useCreateTableMutation,
  useTableStatusMutation,
  useUpdateTableMutation,
} from '@/shared/api/dining-queries';
import type { TableAvailability, TableResponse } from '@/shared/api/dining';
import { ApiError } from '@/shared/api/http-client';
import { useAuthSession } from '@/shared/auth/session';

export function ApiTableEditor({
  open,
  onOpenChange,
  table,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: TableResponse | null;
}) {
  const establishmentId = useAuthSession().context?.establishment?.id;
  const create = useCreateTableMutation();
  const update = useUpdateTableMutation();
  const status = useTableStatusMutation();
  const [number, setNumber] = useState('1');
  const [name, setName] = useState('');
  const [seats, setSeats] = useState('4');
  const [area, setArea] = useState('Salão Principal');
  const [availability, setAvailability] = useState<TableAvailability>('AVAILABLE');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNumber(String(table?.number ?? 1));
    setName(table?.name ?? '');
    setSeats(String(table?.seats ?? 4));
    setArea(table?.area ?? 'Salão Principal');
    setAvailability(table?.availability ?? 'AVAILABLE');
    setError(null);
  }, [open, table]);

  const saving = create.isPending || update.isPending || status.isPending;

  function submit() {
    const parsedNumber = Number(number);
    const parsedSeats = Number(seats);
    if (!Number.isInteger(parsedNumber) || parsedNumber < 1) {
      setError('Informe um número de mesa válido.');
      return;
    }
    if (!Number.isInteger(parsedSeats) || parsedSeats < 1) {
      setError('Informe a capacidade em lugares.');
      return;
    }
    const body = {
      number: parsedNumber,
      name: name.trim() || undefined,
      seats: parsedSeats,
      area: area.trim() || undefined,
      availability,
      layoutX: table?.layoutX ?? undefined,
      layoutY: table?.layoutY ?? undefined,
      version: table?.version,
    };
    const onError = (failure: unknown) => {
      setError(editorError(failure));
      if (failure instanceof ApiError && failure.code === 'STALE_VERSION' && establishmentId) {
        void invalidateDining(establishmentId);
      }
    };
    if (table) {
      update.mutate(
        { tableId: table.id, body },
        {
          onSuccess: () => {
            pushToast({ title: `Mesa ${String(parsedNumber).padStart(2, '0')} atualizada`, tone: 'success' });
            onOpenChange(false);
          },
          onError,
        },
      );
      return;
    }
    create.mutate(body, {
      onSuccess: () => {
        pushToast({ title: `Mesa ${String(parsedNumber).padStart(2, '0')} criada`, tone: 'success' });
        onOpenChange(false);
      },
      onError,
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={table ? 'Editar mesa' : 'Nova mesa'}
      description="Cadastro administrativo da mesa neste estabelecimento."
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {error ? (
          <Alert title="Não foi possível salvar" tone="danger">
            {error}
          </Alert>
        ) : null}
        <FormField id="table-number" label="Número" required>
          <Input
            id="table-number"
            inputMode="numeric"
            value={number}
            onChange={(event) => setNumber(event.target.value)}
          />
        </FormField>
        <FormField id="table-name" label="Identificação">
          <Input id="table-name" value={name} onChange={(event) => setName(event.target.value)} />
        </FormField>
        <FormField id="table-seats" label="Capacidade" required>
          <Input
            id="table-seats"
            inputMode="numeric"
            value={seats}
            onChange={(event) => setSeats(event.target.value)}
          />
        </FormField>
        <FormField id="table-area" label="Área">
          <Input id="table-area" value={area} onChange={(event) => setArea(event.target.value)} />
        </FormField>
        <FormField id="table-availability" label="Disponibilidade">
          <select
            id="table-availability"
            className="h-11 rounded-[12px] border border-input bg-card px-3 text-sm font-semibold"
            value={availability}
            onChange={(event) => setAvailability(event.target.value as TableAvailability)}
          >
            <option value="AVAILABLE">Disponível</option>
            <option value="RESERVED">Reservada</option>
            <option value="UNAVAILABLE">Indisponível</option>
          </select>
        </FormField>
        <Button type="submit" loading={saving}>
          {table ? 'Salvar alterações' : 'Criar mesa'}
        </Button>
        {table ? (
          <Button
            type="button"
            variant="ghost"
            disabled={saving}
            onClick={() => {
              const next = table.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
              status.mutate(
                { tableId: table.id, status: next, version: table.version },
                {
                  onSuccess: () => {
                    pushToast({
                      title:
                        next === 'INACTIVE'
                          ? `Mesa ${String(table.number).padStart(2, '0')} desativada`
                          : `Mesa ${String(table.number).padStart(2, '0')} reativada`,
                      tone: 'success',
                    });
                    onOpenChange(false);
                  },
                  onError: (failure) => setError(editorError(failure)),
                },
              );
            }}
          >
            {table.status === 'ACTIVE' ? 'Desativar mesa' : 'Reativar mesa'}
          </Button>
        ) : null}
      </form>
    </Sheet>
  );
}

function editorError(error: unknown) {
  if (!(error instanceof ApiError)) return 'Não foi possível salvar. Tente de novo.';
  if (error.code === 'STALE_VERSION') {
    return 'A mesa mudou no servidor. Atualizamos os dados antes de uma nova tentativa.';
  }
  if (error.code === 'TABLE_NUMBER_TAKEN') return 'Já existe uma mesa com este número.';
  if (error.code === 'TABLE_OCCUPIED') return 'Mesa com atendimento ativo não pode ficar indisponível.';
  if (error.code === 'GUESTS_EXCEED_CAPACITY') {
    return 'A capacidade não pode ficar abaixo das pessoas do atendimento ativo.';
  }
  if (error.status === 403) return 'Você não pode administrar mesas neste estabelecimento.';
  if (error.code === 'TENANT_SUSPENDED') return 'O estabelecimento está suspenso.';
  return error.message || 'Não foi possível salvar. Tente de novo.';
}
