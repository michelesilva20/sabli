import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AppProviders } from '@/app/providers/app-providers';
import { PizzaBuilder } from '@/features/pizza-builder/pizza-builder';
import { PosPage } from '@/features/pos/pos-page';
import { WaiterPizzaPage } from '@/features/waiter/waiter-pages';
import { getDemoState } from '@/shared/demo/session';
import { flavorPriceForSize, sizeById } from '@/shared/domain/pizza';
import { formatBRL } from '@/shared/domain/money';

function renderBuilder(compact = false) {
  return render(
    <AppProviders>
      <MemoryRouter>
        <PizzaBuilder compact={compact} />
      </MemoryRouter>
    </AppProviders>,
  );
}

describe('montador de pizza', () => {
  it('mostra o preço do sabor no tamanho selecionado', async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.click((await screen.findByText('Broto')).closest('button')!);
    await user.click(screen.getByRole('button', { name: '2. Sabores' }));
    const price = flavorPriceForSize(5890, sizeById('broto'));
    expect(await screen.findByText(`Broto ${formatBRL(price)}`)).toBeInTheDocument();
  });

  it('preserva sabores ao reduzir o tamanho e bloqueia o avanço', async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.click(await screen.findByRole('button', { name: '2. Sabores' }));
    await user.click(await screen.findByRole('button', { name: /^Calabresa/ }));
    await user.click(screen.getByRole('button', { name: /^Muçarela/ }));
    await user.click(screen.getByRole('button', { name: '1. Tamanho' }));
    await user.click((await screen.findByText('Broto')).closest('button')!);
    expect(screen.getByText(/nada foi descartado automaticamente/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByRole('button', { name: /^Calabresa/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /^Muçarela/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  it('explica o limite de sabores sem desabilitar as opções', async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.click((await screen.findByText('Broto')).closest('button')!);
    await user.click(screen.getByRole('button', { name: '2. Sabores' }));
    await user.click(await screen.findByRole('button', { name: /^Calabresa/ }));
    const mucarela = screen.getByRole('button', { name: /^Muçarela/ });
    expect(mucarela).toBeEnabled();
    await user.click(mucarela);
    expect(screen.getByRole('status')).toHaveTextContent(/broto aceita até 1 sabor/i);
    expect(mucarela).toHaveAttribute('aria-pressed', 'false');
  });

  it('bloqueia a revisão até haver sabor', async () => {
    renderBuilder();
    expect(await screen.findByRole('button', { name: '5. Revisão' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '2. Sabores' })).toBeEnabled();
  });

  it('volta sem perder as escolhas', async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.click(await screen.findByRole('button', { name: '2. Sabores' }));
    await user.click(await screen.findByRole('button', { name: /^Calabresa/ }));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await user.click(await screen.findByRole('button', { name: 'Voltar' }));
    expect(screen.getByRole('button', { name: /^Calabresa/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('adiciona quantidade maior que um e atualiza o total', async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.click(await screen.findByRole('button', { name: '2. Sabores' }));
    await user.click(await screen.findByRole('button', { name: /^Calabresa/ }));
    await user.click(screen.getByRole('button', { name: '5. Revisão' }));
    await user.click(await screen.findByRole('button', { name: 'Aumentar pizzas' }));
    const unit = flavorPriceForSize(5890, sizeById('grande'));
    expect(screen.getAllByText(formatBRL(unit * 2)).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Adicionar ao pedido' }));
    expect(getDemoState().lines[0]).toMatchObject({
      quantity: 2,
      unitPriceCents: unit,
      name: 'Pizza grande',
    });
  });

  it('mantém uma única inclusão após dois cliques', async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.click(await screen.findByRole('button', { name: '2. Sabores' }));
    await user.click(await screen.findByRole('button', { name: /^Calabresa/ }));
    await user.click(screen.getByRole('button', { name: '5. Revisão' }));
    const add = await screen.findByRole('button', { name: 'Adicionar ao pedido' });
    fireEvent.click(add);
    fireEvent.click(add);
    expect(getDemoState().lines).toHaveLength(1);
  });
});

describe('pdv e garçom', () => {
  it('mostra o resumo acessível no layout compacto', async () => {
    render(
      <AppProviders>
        <MemoryRouter>
          <PosPage />
        </MemoryRouter>
      </AppProviders>,
    );
    expect(await screen.findByRole('button', { name: 'Ver pedido' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Itens do pedido' })).toBeInTheDocument();
  });

  it('monta pizza no atendimento do garçom', async () => {
    const user = userEvent.setup();
    render(
      <AppProviders>
        <MemoryRouter>
          <WaiterPizzaPage />
        </MemoryRouter>
      </AppProviders>,
    );
    await user.click(await screen.findByRole('button', { name: '2. Sabores' }));
    await user.click(await screen.findByRole('button', { name: /^Calabresa/ }));
    await user.click(screen.getByRole('button', { name: '5. Revisão' }));
    await user.click(await screen.findByRole('button', { name: 'Adicionar ao pedido' }));
    expect(getDemoState().lines[0].name).toBe('Pizza grande');
    expect(getDemoState().lines[0].pizza?.sizeId).toBe('grande');
  });
});
