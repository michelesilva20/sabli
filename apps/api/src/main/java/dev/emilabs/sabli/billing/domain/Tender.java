package dev.emilabs.sabli.billing.domain;

import dev.emilabs.sabli.shared.error.ApiException;

public final class Tender {

  private Tender() {}

  public static Result apply(PaymentMethod method, int remainingCents, int tenderedCents) {
    if (remainingCents <= 0) {
      throw ApiException.unprocessable("BILL_SETTLED", "A conta já está quitada.");
    }
    if (tenderedCents <= 0) {
      throw ApiException.unprocessable("EMPTY_TENDER", "Informe um valor maior que zero.");
    }
    if (method.isCash()) {
      return new Result(
          Math.min(tenderedCents, remainingCents), tenderedCents, Math.max(0, tenderedCents - remainingCents));
    }
    if (tenderedCents > remainingCents) {
      throw ApiException.unprocessable(
          "OVER_REMAINING", "PIX e cartão não aceitam valor acima do saldo restante.");
    }
    return new Result(tenderedCents, tenderedCents, 0);
  }

  public record Result(int appliedCents, int tenderedCents, int changeCents) {}
}
