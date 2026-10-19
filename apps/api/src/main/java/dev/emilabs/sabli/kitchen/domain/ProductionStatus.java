package dev.emilabs.sabli.kitchen.domain;

import java.util.Collection;
import java.util.List;

public enum ProductionStatus {
  WAITING,
  PREPARING,
  READY,
  DELIVERED;

  public ProductionStatus next() {
    return switch (this) {
      case WAITING -> PREPARING;
      case PREPARING -> READY;
      case READY -> DELIVERED;
      case DELIVERED -> null;
    };
  }

  public static ProductionStatus aggregate(Collection<ProductionStatus> statuses) {
    List<ProductionStatus> values = statuses == null ? List.of() : List.copyOf(statuses);
    if (values.isEmpty() || values.stream().allMatch(status -> status == WAITING)) {
      return WAITING;
    }
    if (values.stream().allMatch(status -> status == DELIVERED)) {
      return DELIVERED;
    }
    if (values.stream().allMatch(status -> status == READY || status == DELIVERED)) {
      return READY;
    }
    return PREPARING;
  }
}
