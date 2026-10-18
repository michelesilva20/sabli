import { expect, test } from '@playwright/test';

test('montador adiciona pizza com preço do tamanho', async ({ page }) => {
  await page.goto('/pdv/montar-pizza');
  await page.getByRole('radio', { name: 'Escuro' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('button', { name: /Broto/ }).click();
  await page.getByRole('button', { name: '2. Sabores' }).click();
  await page.getByRole('button', { name: /^Calabresa/ }).click();
  await expect(page.getByText(/Broto R\$/).first()).toBeVisible();
  await page.getByRole('button', { name: '5. Revisão' }).click();
  await page.getByRole('button', { name: 'Adicionar ao pedido' }).click();
  await expect(page.getByRole('heading', { name: 'Pizza no pedido' })).toBeVisible();
});

test('pdv mobile expõe o pedido sem overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pdv');
  await page.getByRole('button', { name: 'Adicionar Calabresa' }).click();
  const dock = page.getByRole('button', { name: 'Ver pedido' });
  await expect(dock).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  expect(overflow).toBe(true);
  await dock.click();
  await expect(page.getByRole('button', { name: /diminuir calabresa/i })).toBeVisible();
});
