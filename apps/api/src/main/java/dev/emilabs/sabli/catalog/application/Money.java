package dev.emilabs.sabli.catalog.application;

import dev.emilabs.sabli.shared.error.ApiException;

public final class Money {

  private Money() {}

  public static int requireCents(int cents) {
    if (cents < 0) {
      throw ApiException.badRequest("O preço não pode ser negativo.");
    }
    return cents;
  }
}
