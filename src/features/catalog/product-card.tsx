import { Plus } from 'lucide-react';
import { ProductArt } from '@/features/catalog/product-art';
import { Badge } from '@/design-system/components/badge';
import { Button } from '@/design-system/components/button';
import { formatBRL } from '@/shared/domain/money';
import type { Product } from '@/shared/types/domain';
import { cn } from '@/shared/utils/cn';

export function ProductCatalogCard({
  product,
  available,
  onAdd,
  showAdd = true,
  onToggleAvailability,
}: {
  product: Product;
  available: boolean;
  onAdd?: () => void;
  showAdd?: boolean;
  onToggleAvailability?: () => void;
}) {
  return (
    <article
      className={cn(
        'overflow-hidden rounded-[18px] border border-border/70 bg-card shadow-card transition duration-150 hover:-translate-y-0.5 hover:border-primary-action/40 hover:shadow-pop motion-reduce:transform-none',
        !available && 'opacity-80',
      )}
    >
      <div className="relative">
        <ProductArt image={product.image} available={available} />
        {!available ? (
          <span className="absolute top-2.5 left-2.5">
            <Badge tone="neutral">Indisponível</Badge>
          </span>
        ) : null}
      </div>
      <div className="grid gap-2.5 p-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-extrabold">{product.name}</h3>
          <p className="mt-0.5 line-clamp-2 text-xs font-semibold text-muted-foreground">
            {product.description}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="tabular text-lg leading-none font-extrabold">
            {formatBRL(product.priceCents)}
          </p>
          {showAdd ? (
            <button
              type="button"
              disabled={!available}
              onClick={onAdd}
              className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-primary-action text-primary-action-foreground transition duration-150 hover:bg-primary-hover disabled:bg-muted disabled:text-muted-foreground motion-reduce:transition-none"
              aria-label={available ? `Adicionar ${product.name}` : `${product.name} indisponível`}
            >
              <Plus className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
        {onToggleAvailability ? (
          <Button variant="outline" size="sm" onClick={onToggleAvailability}>
            {available ? 'Marcar indisponível' : 'Marcar disponível'}
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export function ProductCategoryTabs({
  categories,
  value,
  onChange,
}: {
  categories: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Categorias">
      {categories.map((category) => {
        const selected = category.id === value;
        return (
          <button
            key={category.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(category.id)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-extrabold whitespace-nowrap',
              selected
                ? 'bg-foreground text-background'
                : 'border border-border bg-card text-foreground',
            )}
          >
            {category.name}
          </button>
        );
      })}
    </div>
  );
}
