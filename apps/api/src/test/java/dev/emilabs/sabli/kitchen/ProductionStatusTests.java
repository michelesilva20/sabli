package dev.emilabs.sabli.kitchen;

import dev.emilabs.sabli.kitchen.domain.ProductionStatus;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ProductionStatusTests {

  @Test
  void aggregatesFromIndividualStatuses() {
    assertThat(ProductionStatus.aggregate(List.of())).isEqualTo(ProductionStatus.WAITING);
    assertThat(ProductionStatus.aggregate(List.of(ProductionStatus.WAITING, ProductionStatus.WAITING)))
        .isEqualTo(ProductionStatus.WAITING);
    assertThat(ProductionStatus.aggregate(List.of(ProductionStatus.WAITING, ProductionStatus.PREPARING)))
        .isEqualTo(ProductionStatus.PREPARING);
    assertThat(ProductionStatus.aggregate(List.of(ProductionStatus.READY, ProductionStatus.DELIVERED)))
        .isEqualTo(ProductionStatus.READY);
    assertThat(ProductionStatus.aggregate(List.of(ProductionStatus.READY, ProductionStatus.READY)))
        .isEqualTo(ProductionStatus.READY);
    assertThat(ProductionStatus.aggregate(List.of(ProductionStatus.DELIVERED, ProductionStatus.DELIVERED)))
        .isEqualTo(ProductionStatus.DELIVERED);
  }

  @Test
  void doesNotSkipStates() {
    assertThat(ProductionStatus.WAITING.next()).isEqualTo(ProductionStatus.PREPARING);
    assertThat(ProductionStatus.PREPARING.next()).isEqualTo(ProductionStatus.READY);
    assertThat(ProductionStatus.READY.next()).isEqualTo(ProductionStatus.DELIVERED);
    assertThat(ProductionStatus.DELIVERED.next()).isNull();
  }
}
