import { expect, test } from '@playwright/test';

test('percorre o atendimento da mesa até a conta solicitada', async ({ page }) => {
  await page.goto('/mesas');
  await page.getByRole('button', { name: /Mesa 01, Disponível/i }).click();
  const sheet = page.getByRole('dialog', { name: /Mesa 01/i });
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Abrir atendimento' }).click();

  await expect(page.getByRole('heading', { name: 'Novo pedido' })).toBeVisible();
  await expect(page.getByText(/Pedido vinculado à Mesa 01/)).toBeVisible();

  await page.getByRole('button', { name: 'Montar pizza' }).click();
  await expect(page.getByRole('heading', { name: 'Montar pizza' })).toBeVisible();
  await expect(page.getByText(/Mesa 01 · o rascunho do PDV permanece/)).toBeVisible();
  await page.getByRole('button', { name: /Broto/ }).click();
  await page.getByRole('button', { name: '2. Sabores' }).click();
  await page.getByRole('button', { name: /^Calabresa/ }).click();
  await page.getByRole('button', { name: '5. Revisão' }).click();
  await page.getByRole('button', { name: 'Adicionar ao pedido' }).click();
  await expect(page.getByRole('heading', { name: 'Pizza no pedido' })).toBeVisible();
  await page.getByRole('button', { name: 'Ver pedido' }).click();

  await expect(page.getByRole('heading', { name: 'Novo pedido' })).toBeVisible();
  await expect(page.getByText(/Pedido vinculado à Mesa 01/)).toBeVisible();
  await page.getByRole('button', { name: 'Enviar para cozinha' }).click();

  await expect(page.getByRole('heading', { name: 'Comandas' })).toBeVisible();
  await page.getByRole('link', { name: 'Cozinha' }).click();
  await expect(page.getByText('Mesa 01').first()).toBeVisible();
  await expect(page.getByText('Pizza broto').first()).toBeVisible();
  await page.getByRole('link', { name: 'Painel' }).click();
  await page.getByRole('link', { name: 'Comandas' }).click();
  await expect(page.getByRole('heading', { name: 'Comandas' })).toBeVisible();
  await page.getByRole('button', { name: /Mesa 01/i }).click();
  await expect(page.getByText('Pizza broto').first()).toBeVisible();
  await expect(page.getByText('1/1 Calabresa').first()).toBeVisible();
  await page.getByRole('button', { name: 'Pedir conta' }).click();
  await expect(page.getByText(/conta pendente/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reabrir atendimento' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Adicionar itens' })).toHaveCount(0);
});
