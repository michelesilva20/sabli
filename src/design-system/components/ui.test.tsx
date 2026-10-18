import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/design-system/components/button';
import { ThemeSwitcher } from '@/design-system/components/theme-switcher';
import { renderWithProviders } from '@/test/render';

describe('botões', () => {
  it('expõe variante, estado de carregamento e impede novo clique', async () => {
    const user = userEvent.setup();
    let clicks = 0;
    renderWithProviders(
      <Button variant="destructive" loading onClick={() => (clicks += 1)}>
        Excluir
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Excluir' });
    expect(button).toHaveAttribute('data-variant', 'destructive');
    expect(button).toBeDisabled();
    await user.click(button);
    expect(clicks).toBe(0);
  });
});

describe('tema', () => {
  it('alterna e persiste a preferência', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ThemeSwitcher />);
    await user.click(screen.getByRole('radio', { name: 'Escuro' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('sabli-theme')).toBe('dark');
    await user.click(screen.getByRole('radio', { name: 'Claro' }));
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('sabli-theme')).toBe('light');
  });
});
