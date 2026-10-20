package dev.emilabs.sabli.billing.domain;

public enum PaymentMethod {
  CASH,
  PIX,
  DEBIT_CARD,
  CREDIT_CARD;

  public boolean isCash() {
    return this == CASH;
  }
}
