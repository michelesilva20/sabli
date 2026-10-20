const keys = new Map<string, string>();

export function paymentAttemptKey(billId: string): string {
  const existing = keys.get(billId);
  if (existing) return existing;
  const key = crypto.randomUUID();
  keys.set(billId, key);
  return key;
}

export function clearPaymentAttempt(billId: string) {
  keys.delete(billId);
}

export function resetPaymentAttempts() {
  keys.clear();
}

export function peekPaymentAttempt(billId: string) {
  return keys.get(billId) ?? null;
}
