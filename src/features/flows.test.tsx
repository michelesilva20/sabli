import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, RouterProvider, createMemoryRouter } from 'react-router';
import { AppProviders } from '@/app/providers/app-providers';
import { createAppRoutes } from '@/app/router/router';
import { render, type RenderResult } from '@testing-library/react';
import { DiningPage } from '@/features/dining/dining-page';
import { PosPage } from '@/features/pos/pos-page';
import { KitchenPage } from '@/features/kitchen/kitchen-page';
import { CashPage } from '@/features/cash/cash-page';
function renderInRouter(ui: ReactElement): RenderResult {
  return render(
    <AppProviders>
      <MemoryRouter>{ui}</MemoryRouter>
    </AppProviders>,
  );
}

describe('navegação', () => {
  it('mostra o início e leva às mesas', async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter(createAppRoutes(), { initialEntries: ['/inicio'] });
    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    );
    expect(await screen.findByRole('heading', { name: /mariana/i })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Mesas' }));
    expect(await screen.findByRole('heading', { name: 'Mapa de mesas' })).toBeInTheDocument();
  });
});

describe('mesas', () => {
  it('seleciona uma mesa e mostra o detalhe', async () => {
    const user = userEvent.setup();
    renderInRouter(<DiningPage />);
    await user.click(screen.getByRole('button', { name: /mesa 03/i }));
    expect(await screen.findByRole('dialog', { name: /mesa 03/i })).toBeInTheDocument();
  });
});

describe('pdv', () => {
  it('adiciona um produto disponível ao pedido', async () => {
    const user = userEvent.setup();
    renderInRouter(<PosPage />);
    const add = await screen.findByRole('button', { name: 'Adicionar Calabresa' });
    await user.click(add);
    expect(screen.getByRole('button', { name: /diminuir calabresa/i })).toBeInTheDocument();
  });
});

describe('kds', () => {
  it('move um ticket aguardando para preparo', async () => {
    const user = userEvent.setup();
    render(
      <AppProviders>
        <KitchenPage />
      </AppProviders>,
    );
    const action = screen.getAllByRole('button', { name: 'Iniciar preparo' })[0];
    await user.click(action);
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Iniciar preparo' }).length).toBe(1);
    });
  });
});

describe('caixa', () => {
  it('exige operador para abrir o turno', async () => {
    const user = userEvent.setup();
    render(
      <AppProviders>
        <CashPage />
      </AppProviders>,
    );
    const operator = screen.getByLabelText(/operador/i);
    await user.clear(operator);
    await user.click(screen.getByRole('button', { name: 'Abrir turno' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/informe quem está no caixa/i);
  });
});
