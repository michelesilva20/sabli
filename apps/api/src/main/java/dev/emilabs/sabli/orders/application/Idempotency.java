package dev.emilabs.sabli.orders.application;

import dev.emilabs.sabli.identity.security.TokenHasher;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

public final class Idempotency {

  private Idempotency() {}

  public static String hash(OrderCommandService.PlaceCommand command) {
    String payload =
        command.channel()
            + "|"
            + nullSafe(command.tableServiceId())
            + "|"
            + command.items().stream().map(Idempotency::line).collect(Collectors.joining(";"));
    return TokenHasher.sha256(payload);
  }

  private static String line(OrderCommandService.LineCommand item) {
    String pizza =
        item.pizza() == null
            ? "-"
            : nullSafe(item.pizza().sizeId())
                + ":"
                + join(item.pizza().flavorIds())
                + ":"
                + nullSafe(item.pizza().crustId())
                + ":"
                + join(item.pizza().extraIds());
    return nullSafe(item.productId())
        + ":"
        + nullSafe(item.variantId())
        + ":"
        + item.quantity()
        + ":"
        + (item.notes() == null ? "" : item.notes().trim())
        + ":"
        + pizza;
  }

  private static String join(List<UUID> ids) {
    if (ids == null || ids.isEmpty()) {
      return "";
    }
    return ids.stream().map(UUID::toString).collect(Collectors.joining(","));
  }

  private static String nullSafe(UUID id) {
    return id == null ? "" : id.toString();
  }
}
