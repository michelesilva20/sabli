package dev.emilabs.sabli.cash.domain;

import dev.emilabs.sabli.billing.domain.PaymentMethod;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

public final class CashDrawer {

  private CashDrawer() {}

  public static int expectedCashCents(List<CashMovement> movements) {
    int cash = 0;
    for (CashMovement movement : movements) {
      cash +=
          switch (movement.type()) {
            case OPENING, SUPPLY -> movement.amountCents();
            case BLEED -> -movement.amountCents();
            case SALE -> movement.method() == PaymentMethod.CASH ? movement.amountCents() : 0;
          };
    }
    return cash;
  }

  public static Map<PaymentMethod, Integer> salesByMethod(List<CashMovement> movements) {
    Map<PaymentMethod, Integer> totals = new EnumMap<>(PaymentMethod.class);
    for (PaymentMethod method : PaymentMethod.values()) {
      totals.put(method, 0);
    }
    for (CashMovement movement : movements) {
      if (movement.type() != CashMovementType.SALE || movement.method() == null) {
        continue;
      }
      totals.merge(movement.method(), movement.amountCents(), Integer::sum);
    }
    return totals;
  }
}
