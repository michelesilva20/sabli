package dev.emilabs.sabli.billing.domain;

public enum BillStatus {
  OPEN,
  PARTIALLY_PAID,
  SETTLED;

  public boolean isSettled() {
    return this == SETTLED;
  }
}
