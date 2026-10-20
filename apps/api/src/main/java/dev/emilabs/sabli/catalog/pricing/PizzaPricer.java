package dev.emilabs.sabli.catalog.pricing;

import dev.emilabs.sabli.catalog.domain.PricingStrategy;
import java.util.ArrayList;
import java.util.List;

/**
 * Precificação determinística em centavos. Arredondamento half-up para o inteiro mais próximo,
 * equivalente a {@code Math.round} em Java e no frontend ({@code src/shared/domain/pizza.ts}).
 */
public final class PizzaPricer {

  private PizzaPricer() {}

  public static int scalePrice(int referenceCents, int numerator, int denominator) {
    if (referenceCents < 0 || numerator < 0 || denominator < 1) {
      throw new IllegalArgumentException("Fator de preço inválido.");
    }
    return Math.toIntExact(Math.round(referenceCents * (double) numerator / denominator));
  }

  public static int averageHalfUp(List<Integer> prices) {
    if (prices.isEmpty()) {
      throw new IllegalArgumentException("A média exige ao menos um preço.");
    }
    long sum = 0;
    for (int price : prices) {
      sum += price;
    }
    return Math.toIntExact(Math.round(sum / (double) prices.size()));
  }

  public static QuoteResult quote(QuoteInput input) {
    if (input.quantity() < 1) {
      throw new IllegalArgumentException("A quantidade precisa ser pelo menos 1.");
    }
    if (input.flavors().isEmpty()) {
      throw new IllegalArgumentException("Selecione ao menos um sabor.");
    }
    if (input.flavors().size() > input.maxFlavors()) {
      throw new IllegalArgumentException("Quantidade de sabores acima do limite deste tamanho.");
    }
    List<Integer> flavorPrices = input.flavors().stream().map(PricedItem::cents).toList();
    int flavorsCents =
        input.strategy() == PricingStrategy.HIGHEST
            ? flavorPrices.stream().mapToInt(Integer::intValue).max().orElseThrow()
            : averageHalfUp(flavorPrices);
    int extrasCents = input.extras().stream().mapToInt(PricedItem::cents).sum();
    int unitCents = flavorsCents + input.crustCents() + extrasCents;
    int totalCents = unitCents * input.quantity();

    List<BreakdownLine> breakdown = new ArrayList<>();
    for (PricedItem flavor : input.flavors()) {
      breakdown.add(new BreakdownLine("FLAVOR", flavor.name(), flavor.cents()));
    }
    breakdown.add(
        new BreakdownLine(
            input.strategy() == PricingStrategy.HIGHEST ? "FLAVOR_HIGHEST" : "FLAVOR_AVERAGE",
            input.strategy() == PricingStrategy.HIGHEST ? "Sabor mais caro" : "Média dos sabores",
            flavorsCents));
    if (input.crust() != null) {
      breakdown.add(new BreakdownLine("CRUST", input.crust().name(), input.crustCents()));
    }
    for (PricedItem extra : input.extras()) {
      breakdown.add(new BreakdownLine("EXTRA", extra.name(), extra.cents()));
    }
    breakdown.add(new BreakdownLine("UNIT", "Unitário", unitCents));
    if (input.quantity() > 1) {
      breakdown.add(new BreakdownLine("QUANTITY", "Quantidade " + input.quantity(), totalCents));
    }
    return new QuoteResult(input.strategy(), flavorsCents, input.crustCents(), extrasCents, unitCents, totalCents, breakdown);
  }

  public record PricedItem(String id, String name, int cents) {}

  public record QuoteInput(
      int maxFlavors,
      List<PricedItem> flavors,
      PricedItem crust,
      int crustCents,
      List<PricedItem> extras,
      int quantity,
      PricingStrategy strategy) {}

  public record BreakdownLine(String code, String label, int cents) {}

  public record QuoteResult(
      PricingStrategy strategy,
      int flavorsCents,
      int crustCents,
      int extrasCents,
      int unitCents,
      int totalCents,
      List<BreakdownLine> breakdown) {}
}
