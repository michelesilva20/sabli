import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/design-system/components/button';
import { EmptyState, Skeleton } from '@/design-system/components/feedback';

export function CatalogProductsState({
  catalog,
  visibleCount,
  search,
  onClearSearch,
  children,
}: {
  catalog: UseQueryResult<{ products: unknown[] }>;
  visibleCount: number;
  search: string;
  onClearSearch: () => void;
  children: ReactNode;
}) {
  if (catalog.isError) {
    return (
      <div role="alert">
        <EmptyState
          icon={<TriangleAlert className="size-8" aria-hidden />}
          title="Não foi possível carregar o cardápio"
          description="A consulta falhou. Tente de novo sem recarregar o restante da sessão."
          action={
            <Button
              variant="outline"
              loading={catalog.isFetching}
              onClick={() => {
                void catalog.refetch();
              }}
            >
              Tentar novamente
            </Button>
          }
        />
      </div>
    );
  }

  if (catalog.isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-56" />
        ))}
      </div>
    );
  }

  if ((catalog.data?.products.length ?? 0) === 0) {
    return (
      <EmptyState
        title="Cardápio vazio"
        description="Nenhum produto está disponível nesta demonstração."
      />
    );
  }

  if (visibleCount === 0) {
    return (
      <EmptyState
        title="Nenhum produto encontrado"
        description="Tente outro nome ou volte para uma categoria do cardápio."
        action={
          search ? (
            <Button variant="outline" onClick={onClearSearch}>
              Limpar busca
            </Button>
          ) : null
        }
      />
    );
  }

  return children;
}
