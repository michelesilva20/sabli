export function splitBill(totalCents: number, people: number): number[] {
  if (!Number.isInteger(people) || people < 1) {
    throw new Error('Informe ao menos uma pessoa para dividir a conta.');
  }
  if (!Number.isInteger(totalCents) || totalCents < 0) {
    throw new Error('O valor da conta precisa ser um inteiro em centavos.');
  }

  const base = Math.floor(totalCents / people);
  const remainder = totalCents - base * people;
  return Array.from({ length: people }, (_, index) => base + (index < remainder ? 1 : 0));
}
