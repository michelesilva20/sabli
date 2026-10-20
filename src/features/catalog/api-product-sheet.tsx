import { useEffect, useState } from 'react';
import { Button } from '@/design-system/components/button';
import { FormField } from '@/design-system/components/form-field';
import { Input, Textarea } from '@/design-system/components/input';
import { Sheet } from '@/design-system/components/sheet';
import { Alert } from '@/design-system/components/feedback';
import { pushToast } from '@/design-system/components/toast';
import {
  centsToReaisInput,
  reaisToCents,
  type CategoryResponse,
  type ProductResponse,
} from '@/shared/api/catalog';
import { useCreateProductMutation, useUpdateProductMutation } from '@/shared/api/catalog-queries';
import { ApiError } from '@/shared/api/http-client';

export function ApiProductSheet({
  open,
  onOpenChange,
  product,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductResponse | null;
  categories: CategoryResponse[];
}) {
  const create = useCreateProductMutation();
  const update = useUpdateProductMutation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [variantName, setVariantName] = useState('Padrão');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(product?.name ?? '');
    setDescription(product?.description ?? '');
    setCategoryId(product?.categoryId ?? categories[0]?.id ?? '');
    const variant = product?.variants.find((item) => item.status === 'ACTIVE') ?? product?.variants[0];
    setPrice(centsToReaisInput(variant?.priceCents ?? product?.priceCents ?? 0));
    setVariantName(variant?.name ?? 'Padrão');
    setError(null);
  }, [open, product, categories]);

  const saving = create.isPending || update.isPending;

  function submit() {
    const priceCents = reaisToCents(price);
    if (!name.trim()) {
      setError('Informe o nome do produto.');
      return;
    }
    if (!categoryId) {
      setError('Escolha uma categoria.');
      return;
    }
    if (priceCents == null) {
      setError('Informe um preço válido em reais.');
      return;
    }
    const body = {
      categoryId,
      name: name.trim(),
      description: description.trim() || undefined,
      kind: 'STANDARD' as const,
      available: product?.available ?? true,
      priceCents,
      variants: [{ name: variantName.trim() || 'Padrão', priceCents, available: true }],
      version: product?.version,
    };
    const onError = (failure: unknown) => {
      setError(failure instanceof ApiError && failure.status === 403 ? 'Você não pode alterar o catálogo.' : 'Não foi possível salvar.');
    };
    if (product) {
      update.mutate(
        { productId: product.id, body },
        {
          onSuccess: () => {
            pushToast({ title: `${name.trim()} atualizado`, tone: 'success' });
            onOpenChange(false);
          },
          onError,
        },
      );
      return;
    }
    create.mutate(body, {
      onSuccess: () => {
        pushToast({ title: `${name.trim()} criado`, tone: 'success' });
        onOpenChange(false);
      },
      onError,
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={product ? 'Editar produto' : 'Novo produto'}
      description="Nome, categoria, variação e preço em centavos no servidor."
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
        <FormField id="product-name" label="Nome" required>
          <Input id="product-name" value={name} onChange={(event) => setName(event.target.value)} />
        </FormField>
        <FormField id="product-category" label="Categoria" required>
          <select
            id="product-category"
            className="h-11 rounded-[12px] border border-input bg-card px-3 text-sm font-semibold"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id="product-description" label="Descrição">
          <Textarea
            id="product-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </FormField>
        <FormField id="product-variant" label="Variação">
          <Input
            id="product-variant"
            value={variantName}
            onChange={(event) => setVariantName(event.target.value)}
          />
        </FormField>
        <FormField id="product-price" label="Preço" required description="Valor em reais. O servidor grava em centavos.">
          <Input
            id="product-price"
            inputMode="decimal"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
        </FormField>
        <Button type="submit" loading={saving}>
          {product ? 'Salvar alterações' : 'Criar produto'}
        </Button>
      </form>
    </Sheet>
  );
}
