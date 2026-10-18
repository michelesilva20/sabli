import { expect, test } from '@playwright/test';

test('quita a conta e libera a mesa no caixa demonstrativo', async ({ page }) => {
  await page.goto('/mesas');
  await page.getByRole('button', { name: /Mesa 01, Disponível/i }).click();
  const sheet = page.getByRole('dialog', { name: /Mesa 01/i });
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Abrir atendimento' }).click();

  await expect(page.getByRole('heading', { name: 'Novo pedido' })).toBeVisible();
  await page.getByRole('button', { name: 'Adicionar Calabresa' }).click();
  await page.getByRole('button', { name: 'Enviar para cozinha' }).click();

  await expect(page.getByRole('heading', { name: 'Comandas' })).toBeVisible();
  await page.getByRole('button', { name: /Mesa 01/i }).click();
  await page.getByRole('button', { name: 'Pedir conta' }).click();
  await expect(page.getByText(/conta pendente/i)).toBeVisible();
  await page.getByRole('button', { name: 'Receber pagamento' }).click();

  await expect(page.getByRole('heading', { name: 'Abrir caixa' })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir turno' }).click();
  await expect(page.getByText(/conferência da mesa 01/i)).toBeVisible();
  await page.getByRole('button', { name: 'Pagar o restante' }).click();
  await expect(page.getByText(/conta quitada/i)).toBeVisible();
  await page.getByRole('button', { name: 'Encerrar atendimento' }).click();

  await page.getByRole('link', { name: 'Mesas' }).click();
  await expect(page.getByRole('heading', { name: 'Mapa de mesas' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Mesa 01, Disponível/i })).toBeVisible();
});
