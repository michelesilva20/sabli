package dev.emilabs.sabli.billing;

import dev.emilabs.sabli.billing.domain.PaymentMethod;
import dev.emilabs.sabli.billing.domain.Tender;
import dev.emilabs.sabli.shared.error.ApiException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TenderTests {

  @Test
  void cashAllowsChangeAndCapsAppliedToRemaining() {
    Tender.Result result = Tender.apply(PaymentMethod.CASH, 10000, 12000);
    assertThat(result.appliedCents()).isEqualTo(10000);
    assertThat(result.tenderedCents()).isEqualTo(12000);
    assertThat(result.changeCents()).isEqualTo(2000);
  }

  @Test
  void pixAndCardsRejectOverRemaining() {
    assertThatThrownBy(() -> Tender.apply(PaymentMethod.PIX, 10000, 12000))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).code())
        .isEqualTo("OVER_REMAINING");
    assertThatThrownBy(() -> Tender.apply(PaymentMethod.CREDIT_CARD, 500, 501))
        .isInstanceOf(ApiException.class)
        .extracting(ex -> ((ApiException) ex).code())
        .isEqualTo("OVER_REMAINING");
  }
}
