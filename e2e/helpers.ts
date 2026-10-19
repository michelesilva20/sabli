import { expect, type Page } from '@playwright/test';

export async function signInApi(page: Page) {
  await page.goto('/entrar');
  const email = page.getByLabel(/e-mail/i);
  const selectHeading = page.getByRole('heading', { name: 'Onde você vai operar?' });
  const homeHeading = page.getByRole('heading', { name: 'Início' });
  await expect(email.or(selectHeading).or(homeHeading)).toBeVisible();
  if (await email.isVisible()) {
    await email.fill('ana.e2e@example.com');
    await page.getByLabel(/senha/i).fill('password10');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(selectHeading.or(homeHeading)).toBeVisible();
  }
  if (await selectHeading.isVisible()) {
    await page.getByRole('button', { name: 'Entrar' }).click();
  }
  await expect(homeHeading).toBeVisible();
}
