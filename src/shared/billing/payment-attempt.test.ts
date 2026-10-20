import { describe, expect, it } from 'vitest';
import {
  clearPaymentAttempt,
  paymentAttemptKey,
  peekPaymentAttempt,
  resetPaymentAttempts,
} from '@/shared/billing/payment-attempt';

describe('tentativa de pagamento', () => {
  it('reutiliza a mesma chave até o sucesso ou conflito', () => {
    resetPaymentAttempts();
    const first = paymentAttemptKey('bill-a');
    expect(paymentAttemptKey('bill-a')).toBe(first);
    expect(paymentAttemptKey('bill-b')).not.toBe(first);
    expect(peekPaymentAttempt('bill-a')).toBe(first);
    clearPaymentAttempt('bill-a');
    expect(peekPaymentAttempt('bill-a')).toBeNull();
    expect(paymentAttemptKey('bill-a')).not.toBe(first);
  });
});
