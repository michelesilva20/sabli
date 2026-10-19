package dev.emilabs.sabli.cash;

import dev.emilabs.sabli.billing.domain.PaymentMethod;
import dev.emilabs.sabli.cash.domain.CashDrawer;
import dev.emilabs.sabli.cash.domain.CashMovement;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CashDrawerTests {

  @Test
  void pixDoesNotChangeDrawerAndCashSaleUsesAppliedAmount() {
    UUID session = UUID.randomUUID();
    UUID est = UUID.randomUUID();
    UUID org = UUID.randomUUID();
    UUID user = UUID.randomUUID();
    List<CashMovement> movements =
        List.of(
            CashMovement.opening(session, est, org, 20000, user, "Op"),
            CashMovement.sale(session, est, org, PaymentMethod.CASH, 10000, UUID.randomUUID(), user, "Op"),
            CashMovement.sale(session, est, org, PaymentMethod.PIX, 4500, UUID.randomUUID(), user, "Op"),
            CashMovement.supply(session, est, org, 3000, user, "Op", "suprimento"),
            CashMovement.bleed(session, est, org, 2000, user, "Op", "sangria"));
    assertThat(CashDrawer.expectedCashCents(movements)).isEqualTo(31000);
    assertThat(CashDrawer.salesByMethod(movements).get(PaymentMethod.CASH)).isEqualTo(10000);
    assertThat(CashDrawer.salesByMethod(movements).get(PaymentMethod.PIX)).isEqualTo(4500);
  }
}
