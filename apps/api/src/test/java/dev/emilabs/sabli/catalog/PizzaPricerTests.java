package dev.emilabs.sabli.catalog;

import dev.emilabs.sabli.catalog.domain.PricingStrategy;
import dev.emilabs.sabli.catalog.pricing.PizzaPricer;
import dev.emilabs.sabli.catalog.pricing.PizzaPricer.PricedItem;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PizzaPricerTests {

  @Test
  void scalesReferencePriceWithHalfUpRounding() {
    assertThat(PizzaPricer.scalePrice(5890, 1, 1)).isEqualTo(5890);
    assertThat(PizzaPricer.scalePrice(5890, 3, 5)).isEqualTo(3534);
    assertThat(PizzaPricer.scalePrice(5890, 4, 5)).isEqualTo(4712);
    assertThat(PizzaPricer.scalePrice(5890, 7, 5)).isEqualTo(8246);
    assertThat(PizzaPricer.scalePrice(6790, 4, 5)).isEqualTo(5432);
  }

  @Test
  void averagesWithHalfUpRounding() {
    assertThat(PizzaPricer.averageHalfUp(List.of(5890, 5490))).isEqualTo(5690);
    assertThat(PizzaPricer.averageHalfUp(List.of(1, 2))).isEqualTo(2);
  }

  @Test
  void chargesTheHighestFlavor() {
    var result =
        PizzaPricer.quote(
            new PizzaPricer.QuoteInput(
                3,
                List.of(item("calabresa", 5890), item("quatro", 6790)),
                item("catupiry", 800),
                800,
                List.of(item("bacon", 300)),
                1,
                PricingStrategy.HIGHEST));
    assertThat(result.flavorsCents()).isEqualTo(6790);
    assertThat(result.crustCents()).isEqualTo(800);
    assertThat(result.extrasCents()).isEqualTo(300);
    assertThat(result.unitCents()).isEqualTo(7890);
    assertThat(result.totalCents()).isEqualTo(7890);
  }

  @Test
  void chargesTheAverageOfTwoFlavors() {
    var result =
        PizzaPricer.quote(
            new PizzaPricer.QuoteInput(
                2,
                List.of(item("calabresa", 5890), item("mucarela", 5490)),
                null,
                0,
                List.of(),
                1,
                PricingStrategy.AVERAGE));
    assertThat(result.flavorsCents()).isEqualTo(5690);
    assertThat(result.totalCents()).isEqualTo(5690);
  }

  @Test
  void multipliesUnitPriceByQuantity() {
    var result =
        PizzaPricer.quote(
            new PizzaPricer.QuoteInput(
                1,
                List.of(item("calabresa", 3534)),
                item("tradicional", 0),
                0,
                List.of(),
                3,
                PricingStrategy.HIGHEST));
    assertThat(result.unitCents()).isEqualTo(3534);
    assertThat(result.totalCents()).isEqualTo(10602);
  }

  @Test
  void rejectsTooManyFlavors() {
    assertThatThrownBy(
            () ->
                PizzaPricer.quote(
                    new PizzaPricer.QuoteInput(
                        1,
                        List.of(item("a", 1000), item("b", 2000)),
                        null,
                        0,
                        List.of(),
                        1,
                        PricingStrategy.HIGHEST)))
        .isInstanceOf(IllegalArgumentException.class);
  }

  private static PricedItem item(String name, int cents) {
    return new PricedItem(name, name, cents);
  }
}
