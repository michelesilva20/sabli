import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ProductCatalogCard, ProductCategoryTabs } from '@/features/catalog/product-card';
import { Alert, EmptyState, Skeleton } from '@/design-system/components/feedback';
import { Button } from '@/design-system/components/button';
import { SearchInput } from '@/design-system/components/input';
import { PageHeader } from '@/design-system/components/navigation';
import { toCatalogCard } from '@/shared/api/catalog';
import { useCatalogCategoriesQuery, useCatalogProductsQuery } from '@/shared/api/catalog-queries';
import { ApiError } from '@/shared/api/http-client';
import { formatBRL } from '@/shared/domain/money';

const ALL_CATEGORIES = 'all';

export function ApiPosPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const categories = useCatalogCategoriesQuery();
  const products = useCatalogProductsQuery({
    q: search.trim() || undefined,
    categoryId: category === ALL_CATEGORIES ? undefined : category,
    page: 0,
    size: 40,
  });

  const tabs = useMemo(
    () => [{ id: ALL_CATEGORIES, name: 'Todas' }, ...(categories.data ?? []).map((item) => ({ id: item.id, name: item.name }))],
    [categories.data],
  );
  const items = products.data?.items ?? [];
  const error =
    products.error instanceof ApiError && products.error.status === 403
      ? 'Acesso negado ao cardápio deste estabelecimento.'
      : products.isError
        ? 'Não foi possível carregar o cardápio.'
        : null;

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Novo pedido"
        description="Consulta o catálogo real. A confirmação de pedidos no modo API ainda não está liberada."
        actions={
          <Button variant="secondary" onClick={() => navigate('/pdv/montar-pizza')}>
            Montar pizza
          </Button>
        }
      />
      <Alert title="Envio de pedido bloqueado">
        Você pode ver produtos e cotar pizza. Pedidos fictícios não são enviados neste checkpoint.
      </Alert>
      <SearchInput
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar no cardápio"
        aria-label="Buscar no cardápio"
      />
      {!search ? <ProductCategoryTabs categories={tabs} value={category} onChange={setCategory} /> : null}
      {error ? (
        <EmptyState title={error} description="Nenhum fixture de demonstração é usado como fallback." />
      ) : products.isLoading || categories.isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-56" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title={search ? 'Nenhum produto encontrado' : 'Catálogo vazio'}
          description={search ? 'Tente outro nome.' : 'Este estabelecimento ainda não tem produtos ativos.'}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {items.map((product) => {
            const card = toCatalogCard(product);
            return (
              <ProductCatalogCard
                key={product.id}
                product={card}
                available={card.available}
                showAdd={false}
              />
            );
          })}
        </div>
      )}
      <div className="rounded-[16px] border border-border bg-card p-4">
        <p className="text-xs font-bold text-muted-foreground">Total do pedido</p>
        <p className="tabular text-lg font-extrabold">{formatBRL(0)}</p>
        <Button className="mt-3" disabled>
          Enviar para cozinha
        </Button>
      </div>
    </div>
  );
}
