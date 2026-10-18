import { expect, test } from '@playwright/test';

test('painel, tema e inclusão de produto no PDV', async ({ page }) => {
  await page.goto('/inicio');
  await expect(page.getByRole('heading', { name: /mariana/i })).toBeVisible();

  await page.getByRole('radio', { name: 'Escuro' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);

  await page.getByRole('link', { name: 'PDV' }).click();
  await page.getByRole('button', { name: 'Adicionar Calabresa' }).click();
  await expect(page.getByRole('button', { name: /diminuir calabresa/i })).toBeVisible();
});
