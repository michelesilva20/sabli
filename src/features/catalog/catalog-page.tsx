import { useState } from 'react';
import { ProductCatalogCard, ProductCategoryTabs } from '@/features/catalog/product-card';
import { useCatalogQuery } from '@/shared/api/hooks';
import { demoSession, useDemoSession } from '@/shared/demo/session';
import { PageHeader } from '@/design-system/components/navigation';
import { pushToast } from '@/design-system/components/toast';

export function CatalogPage() {
  const catalog = useCatalogQuery();
  const session = useDemoSession();
  const [category, setCategory] = useState('pizzas');
  const products = (catalog.data?.products ?? []).filter(
    (product) => product.categoryId === category,
  );
  const categoryName =
    catalog.data?.categories.find((item) => item.id === category)?.name ?? 'Produtos';

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Produtos"
        description="Cardápio da casa. A disponibilidade muda só nesta sessão."
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ProductCategoryTabs
          categories={catalog.data?.categories ?? []}
          value={category}
          onChange={setCategory}
        />
        <p className="shrink-0 text-xs font-bold text-muted-foreground">
          {products.length} {products.length === 1 ? 'item' : 'itens'} em {categoryName}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => {
          const available = session.availability[product.id] !== false;
          return (
            <ProductCatalogCard
              key={product.id}
              product={product}
              available={available}
              showAdd={false}
              onToggleAvailability={() => {
                demoSession.setProductAvailable(product.id, !available);
                pushToast({
                  title: available
                    ? `${product.name} marcado como indisponível`
                    : `${product.name} marcado como disponível`,
                });
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
