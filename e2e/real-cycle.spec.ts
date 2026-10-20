import { expect, test, type Page } from '@playwright/test';
import { provisionRealTenant, type RealTenant } from './real-api';

test.describe.configure({ mode: 'serial' });

async function signInReal(page: Page, tenant: RealTenant) {
  await page.goto('/entrar');
  await page.getByLabel(/e-mail/i).fill(tenant.email);
  await page.getByLabel(/senha/i).fill(tenant.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  const selectHeading = page.getByRole('heading', { name: 'Onde você vai operar?' });
  const homeHeading = page.getByRole('heading', { name: 'Início' });
  await expect(selectHeading.or(homeHeading)).toBeVisible();
  if (await selectHeading.isVisible()) {
    await page.getByRole('button', { name: 'Entrar' }).click();
  }
  await expect(homeHeading).toBeVisible();
  await expect(page.getByText(/loja e2e/i).first()).toBeVisible();
}

test('encerra atendimento sem consumo só com motivo explícito', async ({ page, request }) => {
  test.setTimeout(120_000);
  const tenant = await provisionRealTenant(request);
  await signInReal(page, tenant);

  await page.getByRole('link', { name: 'Mesas' }).click();
  await page.getByRole('button', { name: /mesa 01, disponível/i }).click();
  const tableSheet = page.getByRole('dialog', { name: /mesa 01/i });
  await tableSheet.getByRole('button', { name: 'Abrir atendimento' }).click();
  await expect(tableSheet.getByText('Há um atendimento aberto nesta mesa.')).toBeVisible();
  await expect(tableSheet.getByRole('button', { name: 'Encerrar sem consumo' })).toBeVisible();
  await expect(tableSheet.getByRole('button', { name: 'Encerrar atendimento' })).toHaveCount(0);
  await tableSheet.getByRole('button', { name: 'Encerrar sem consumo' }).click();

  const emptyDialog = page.getByRole('dialog', { name: 'Encerrar sem consumo?' });
  await expect(emptyDialog).toBeVisible();
  await expect(emptyDialog.getByRole('button', { name: 'Confirmar encerramento' })).toBeDisabled();
  await emptyDialog.getByLabel('Motivo do encerramento sem consumo').fill('Cliente desistiu');
  await emptyDialog.getByRole('button', { name: 'Confirmar encerramento' }).click();
  await expect(page.getByText('Mesa 01 liberada', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /mesa 01, disponível/i })).toBeVisible();
});

test('ciclo operacional com API e PostgreSQL reais', async ({ page, request }) => {
  test.setTimeout(120_000);
  const tenant = await provisionRealTenant(request);
  await signInReal(page, tenant);

  await page.getByRole('link', { name: 'Mesas' }).click();
  await page.getByRole('button', { name: /mesa 01, disponível/i }).click();
  const tableSheet = page.getByRole('dialog', { name: /mesa 01/i });
  await tableSheet.getByRole('button', { name: 'Abrir atendimento' }).click();
  await expect(tableSheet.getByText('Há um atendimento aberto nesta mesa.')).toBeVisible();
  await expect(tableSheet.getByRole('button', { name: 'Encerrar sem consumo' })).toBeVisible();
  await expect(tableSheet.getByRole('button', { name: 'Encerrar atendimento' })).toHaveCount(0);
  await tableSheet.getByRole('button', { name: 'Adicionar itens' }).click();

  await expect(page.getByRole('heading', { name: 'Novo pedido' })).toBeVisible();
  await page.getByRole('button', { name: `Adicionar ${tenant.productName}` }).click();
  await page.getByRole('button', { name: 'Enviar para cozinha' }).first().click();
  await expect(page.getByRole('heading', { name: 'Pedidos' })).toBeVisible();
  await expect(page.getByText('#1').first()).toBeVisible();

  await page.getByRole('link', { name: 'Cozinha' }).click();
  await expect(page.locator('article').getByText('#1')).toBeVisible();
  await page.getByRole('button', { name: /iniciar preparo/i }).first().click();
  await expect(page.getByRole('button', { name: /marcar pronto/i }).first()).toBeVisible();

  await page.goto('/mesas');
  await page.getByRole('button', { name: /mesa 01, ocupada/i }).click();
  await page.getByRole('dialog', { name: /mesa 01/i }).getByRole('button', { name: 'Pedir conta' }).click();
  await page.getByRole('button', { name: 'Confirmar pedido de conta' }).click();
  await expect(page.getByText(/a mesa continua ocupada até a quitação/i)).toBeVisible();
  await page.getByRole('dialog', { name: /mesa 01/i }).getByRole('button', { name: 'Fechar' }).click();

  await page.getByRole('link', { name: 'Comandas' }).click();
  await expect(page.getByRole('heading', { name: 'Comandas' })).toBeVisible();
  await page.getByRole('button', { name: /mesa 01/i }).first().click();
  await expect(page.getByText('Pedido #1').first()).toBeVisible();
  await expect(page.getByText(/10%/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Receber pagamento' }).click();

  await expect(page.getByRole('heading', { name: 'Abrir caixa' })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir turno' }).click();
  await expect(page.getByRole('heading', { name: 'Caixa do turno' })).toBeVisible();
  await page.getByRole('radio', { name: 'Dinheiro' }).click();
  const cashAmount = page.getByLabel('Valor recebido em dinheiro');
  await cashAmount.click();
  await cashAmount.fill('1200');
  await expect(page.getByText(/prévia: aplicado r\$ 8,00 · troco r\$ 4,00/i)).toBeVisible();
  await page.getByRole('button', { name: 'Registrar pagamento' }).click();
  await expect(page.getByText(/quitada/i).first()).toBeVisible();
  await page.getByRole('button', { name: 'Encerrar atendimento' }).click();
  await expect(page.getByText(/nenhuma conta pendente/i)).toBeVisible();

  await page.getByRole('link', { name: 'Mesas' }).click();
  await expect(page.getByRole('button', { name: /mesa 01, disponível/i })).toBeVisible();
});
