package dev.emilabs.sabli.dining.domain;

public enum TableServiceStatus {
  OPEN,
  AWAITING_BILL,
  CLOSED;

  public boolean isActive() {
    return this == OPEN || this == AWAITING_BILL;
  }
}
