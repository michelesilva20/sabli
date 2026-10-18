import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ProductCatalogCard, ProductCategoryTabs } from '@/features/catalog/product-card';
import { OrderSummary } from '@/features/ordering/order-summary';
import { useCatalogQuery } from '@/shared/api/hooks';
import { demoSession, useDemoSession } from '@/shared/demo/session';
import { Button } from '@/design-system/components/button';
import { EmptyState, Skeleton } from '@/design-system/components/feedback';
import { SearchInput } from '@/design-system/components/input';
import { PageHeader } from '@/design-system/components/navigation';
import { pushToast } from '@/design-system/components/toast';

export function PosPage() {
  const catalog = useCatalogQuery();
  const session = useDemoSession();
  const navigate = useNavigate();
  const [category, setCategory] = useState('pizzas');
  const [search, setSearch] = useState('');
  const categories = catalog.data?.categories ?? [];
  const products = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (catalog.data?.products ?? []).filter((product) => {
      const inCategory = term ? true : product.categoryId === category;
      const matches = !term || product.name.toLowerCase().includes(term);
      return inCategory && matches;
    });
  }, [catalog.data?.products, category, search]);
  const activeTable = session.tables.find((table) => table.id === session.activeTableId);

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Novo pedido"
        description={
          activeTable
            ? `Mesa ${String(activeTable.number).padStart(2, '0')} · atendimento demonstrativo`
            : 'Balcão · selecione uma mesa no mapa se quiser vincular a conta'
        }
        actions={
          <Button variant="secondary" onClick={() => navigate('/pdv/montar-pizza')}>
            Montar pizza
          </Button>
        }
      />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-4">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar no cardápio"
            aria-label="Buscar no cardápio"
          />
          {!search ? (
            <ProductCategoryTabs categories={categories} value={category} onChange={setCategory} />
          ) : null}
          {catalog.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-56" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              title="Nenhum produto encontrado"
              description="Tente outro nome ou volte para uma categoria do cardápio."
              action={
                <Button variant="outline" onClick={() => setSearch('')}>
                  Limpar busca
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCatalogCard
                  key={product.id}
                  product={product}
                  available={session.availability[product.id] !== false}
                  onAdd={() => {
                    const added = demoSession.addProduct(product);
                    if (!added) {
                      pushToast({ title: 'Produto indisponível', tone: 'danger' });
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
        <OrderSummary
          confirmLabel="Enviar para cozinha"
          onConfirm={() => {
            const order = demoSession.sendToKitchen();
            if (!order) return;
            pushToast({
              title: `Pedido #${order.number} enviado`,
              description:
                'Demonstração local. A cozinha desta sessão foi atualizada, sem servidor.',
              tone: 'success',
            });
          }}
        />
      </div>
    </div>
  );
}
