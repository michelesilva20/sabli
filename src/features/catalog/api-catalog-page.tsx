import { useMemo, useState } from 'react';
import { ProductCatalogCard, ProductCategoryTabs } from '@/features/catalog/product-card';
import { ApiPizzaConfig } from '@/features/catalog/api-pizza-config';
import { ApiProductSheet } from '@/features/catalog/api-product-sheet';
import { Alert, EmptyState, Skeleton } from '@/design-system/components/feedback';
import { Button } from '@/design-system/components/button';
import { SearchInput } from '@/design-system/components/input';
import { PageHeader } from '@/design-system/components/navigation';
import { Checkbox } from '@/design-system/components/choice';
import { pushToast } from '@/design-system/components/toast';
import {
  toCatalogCard,
  type ProductListQuery,
  type ProductResponse,
} from '@/shared/api/catalog';
import {
  useCatalogCategoriesQuery,
  useCatalogProductsQuery,
  useProductAvailabilityMutation,
  useProductStatusMutation,
} from '@/shared/api/catalog-queries';
import { ApiError } from '@/shared/api/http-client';
import { canManageCatalog, useAuthSession } from '@/shared/auth/session';

const ALL_CATEGORIES = 'all';

export function ApiCatalogPage() {
  const session = useAuthSession();
  const canWrite = canManageCatalog(session.context);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [availability, setAvailability] = useState<'all' | 'available' | 'unavailable'>('all');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ProductResponse | null>(null);
  const [pizzaOpen, setPizzaOpen] = useState(false);

  const filters: ProductListQuery = {
    q: search.trim() || undefined,
    categoryId: category === ALL_CATEGORIES ? undefined : category,
    available: availability === 'all' ? undefined : availability === 'available',
    includeInactive: canWrite ? includeInactive : false,
    page,
    size: 12,
  };

  const categories = useCatalogCategoriesQuery(canWrite && includeInactive);
  const products = useCatalogProductsQuery(filters);
  const availabilityMutation = useProductAvailabilityMutation();
  const statusMutation = useProductStatusMutation();

  const tabs = useMemo(
    () => [{ id: ALL_CATEGORIES, name: 'Todas' }, ...(categories.data ?? []).map((item) => ({ id: item.id, name: item.name }))],
    [categories.data],
  );

  const errorMessage = errorCopy(products.error ?? categories.error);
  const forbidden = errorMessage?.code === 'FORBIDDEN';
  const totalPages = products.data ? Math.max(1, Math.ceil(products.data.total / products.data.size)) : 1;

  function resetPage() {
    setPage(0);
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Produtos"
        description="Cardápio do estabelecimento autorizado. Preços e disponibilidade vêm do servidor."
        actions={
          canWrite ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setPizzaOpen(true)}>
                Cardápio de pizza
              </Button>
              <Button
                onClick={() => {
                  setEditing(null);
                  setEditorOpen(true);
                }}
              >
                Novo produto
              </Button>
            </div>
          ) : null
        }
      />
      {forbidden ? (
        <EmptyState
          title="Acesso negado"
          description="Sua membership neste estabelecimento não permite ver o catálogo."
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <SearchInput
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                resetPage();
              }}
              placeholder="Buscar produto"
              aria-label="Buscar produto"
            />
            <div className="flex flex-wrap items-center gap-2">
              <FilterChip
                label="Todos"
                active={availability === 'all'}
                onClick={() => {
                  setAvailability('all');
                  resetPage();
                }}
              />
              <FilterChip
                label="Disponíveis"
                active={availability === 'available'}
                onClick={() => {
                  setAvailability('available');
                  resetPage();
                }}
              />
              <FilterChip
                label="Indisponíveis"
                active={availability === 'unavailable'}
                onClick={() => {
                  setAvailability('unavailable');
                  resetPage();
                }}
              />
            </div>
          </div>
          {canWrite ? (
            <Checkbox
              label="Incluir desativados"
              checked={includeInactive}
              onCheckedChange={(checked) => {
                setIncludeInactive(checked);
                resetPage();
              }}
            />
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <ProductCategoryTabs
              categories={tabs}
              value={category}
              onChange={(id) => {
                setCategory(id);
                resetPage();
              }}
            />
            <p className="shrink-0 text-xs font-bold text-muted-foreground">
              {products.data?.total ?? 0} {(products.data?.total ?? 0) === 1 ? 'item' : 'itens'}
            </p>
          </div>
          {errorMessage && !forbidden ? (
            <div role="alert">
              <EmptyState
                title={errorMessage.title}
                description={errorMessage.description}
                action={
                  <Button variant="outline" onClick={() => void products.refetch()}>
                    Tentar novamente
                  </Button>
                }
              />
            </div>
          ) : products.isLoading || categories.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={index} className="h-56" />
              ))}
            </div>
          ) : (products.data?.items.length ?? 0) === 0 ? (
            <EmptyState
              title={search || availability !== 'all' || category !== ALL_CATEGORIES ? 'Nenhum produto encontrado' : 'Catálogo vazio'}
              description={
                search || availability !== 'all' || category !== ALL_CATEGORIES
                  ? 'Tente outro nome, categoria ou filtro de disponibilidade.'
                  : 'Este estabelecimento ainda não tem produtos ativos.'
              }
              action={
                search ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch('');
                      resetPage();
                    }}
                  >
                    Limpar busca
                  </Button>
                ) : null
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.data?.items.map((product) => {
                const card = toCatalogCard(product);
                const busy = availabilityMutation.isPending || statusMutation.isPending;
                return (
                  <div key={product.id} className="grid gap-2">
                    <ProductCatalogCard
                      product={card}
                      available={card.available}
                      showAdd={false}
                      onToggleAvailability={
                        canWrite
                          ? () => {
                              availabilityMutation.mutate(
                                {
                                  productId: product.id,
                                  available: !product.available,
                                  version: product.version,
                                },
                                {
                                  onSuccess: () =>
                                    pushToast({
                                      title: product.available
                                        ? `${product.name} marcado como indisponível`
                                        : `${product.name} marcado como disponível`,
                                      tone: 'success',
                                    }),
                                  onError: (error) =>
                                    pushToast({
                                      title: mutationError(error),
                                      tone: 'danger',
                                    }),
                                },
                              );
                            }
                          : undefined
                      }
                    />
                    {canWrite ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => {
                            setEditing(product);
                            setEditorOpen(true);
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => {
                            const next = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                            statusMutation.mutate(
                              { productId: product.id, status: next },
                              {
                                onSuccess: () =>
                                  pushToast({
                                    title:
                                      next === 'INACTIVE'
                                        ? `${product.name} desativado`
                                        : `${product.name} reativado`,
                                    tone: 'success',
                                  }),
                                onError: (error) =>
                                  pushToast({ title: mutationError(error), tone: 'danger' }),
                              },
                            );
                          }}
                        >
                          {product.status === 'ACTIVE' ? 'Desativar' : 'Reativar'}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
          {products.data && products.data.total > products.data.size ? (
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                Anterior
              </Button>
              <p className="text-xs font-bold text-muted-foreground">
                Página {page + 1} de {totalPages}
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Próxima
              </Button>
            </div>
          ) : null}
        </>
      )}
      {canWrite ? (
        <>
          <ApiProductSheet
            open={editorOpen}
            onOpenChange={setEditorOpen}
            product={editing}
            categories={categories.data ?? []}
          />
          <ApiPizzaConfig open={pizzaOpen} onOpenChange={setPizzaOpen} />
        </>
      ) : null}
      {availabilityMutation.isPending || statusMutation.isPending ? (
        <Alert title="Salvando">A alteração está sendo confirmada no servidor.</Alert>
      ) : null}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'rounded-full bg-foreground px-3 py-1.5 text-xs font-extrabold text-background'
          : 'rounded-full border border-border bg-card px-3 py-1.5 text-xs font-extrabold'
      }
    >
      {label}
    </button>
  );
}

function errorCopy(error: unknown) {
  if (!error) return null;
  if (error instanceof ApiError && error.status === 403) {
    return { code: 'FORBIDDEN', title: 'Acesso negado', description: 'Você não pode ver este catálogo.' };
  }
  if (error instanceof ApiError && error.status === 404) {
    return {
      code: 'NOT_FOUND',
      title: 'Catálogo não encontrado',
      description: 'O estabelecimento autorizado não devolveu este recurso.',
    };
  }
  if (error instanceof ApiError && error.status === 401) {
    return { code: 'UNAUTHENTICATED', title: 'Sessão expirada', description: 'Entre de novo para continuar.' };
  }
  return {
    code: 'NETWORK',
    title: 'Não foi possível carregar o cardápio',
    description: 'A consulta falhou. Tente de novo sem recarregar o restante da sessão.',
  };
}

function mutationError(error: unknown) {
  if (error instanceof ApiError && error.status === 403) return 'Você não pode alterar o catálogo.';
  if (error instanceof ApiError && error.status === 404) return 'O produto não está neste estabelecimento.';
  return 'Não foi possível salvar. Tente de novo.';
}
