const amount = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatBRL(cents: number): string {
  const sign = cents < 0 ? '−' : '';
  return `${sign}R$ ${amount.format(Math.abs(cents) / 100)}`;
}

export function percentOfCents(cents: number, percent: number): number {
  return Math.round((cents * percent) / 100);
}

export function sumCents(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function parseDigitsToCents(digits: string): number {
  const normalized = digits.replace(/\D/g, '');
  if (!normalized) return 0;
  const value = Number(normalized);
  return Number.isSafeInteger(value) ? value : 0;
}
