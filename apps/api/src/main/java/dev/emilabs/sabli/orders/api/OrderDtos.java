package dev.emilabs.sabli.orders.api;

import dev.emilabs.sabli.catalog.domain.PricingStrategy;
import dev.emilabs.sabli.catalog.domain.ProductKind;
import dev.emilabs.sabli.kitchen.domain.KitchenTicket;
import dev.emilabs.sabli.kitchen.domain.KitchenTicketItem;
import dev.emilabs.sabli.kitchen.domain.ProductionStatus;
import dev.emilabs.sabli.kitchen.domain.TicketPriority;
import dev.emilabs.sabli.orders.application.OrderCommandService.LineCommand;
import dev.emilabs.sabli.orders.application.OrderCommandService.PizzaLine;
import dev.emilabs.sabli.orders.application.OrderCommandService.PlaceCommand;
import dev.emilabs.sabli.orders.domain.CommercialStatus;
import dev.emilabs.sabli.orders.domain.Order;
import dev.emilabs.sabli.orders.domain.OrderChannel;
import dev.emilabs.sabli.orders.domain.OrderItem;
import dev.emilabs.sabli.orders.domain.OrderItemFlavor;
import dev.emilabs.sabli.orders.domain.OrderItemModifier;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;

public final class OrderDtos {

  private OrderDtos() {}

  public record PlaceOrderRequest(
      OrderChannel channel,
      UUID tableServiceId,
      @Size(max = 500) String notes,
      @Min(0) Integer expectedTotalCents,
      @NotEmpty @Valid List<OrderItemRequest> items) {
    PlaceCommand toCommand() {
      return new PlaceCommand(
          channel,
          tableServiceId,
          notes,
          items.stream().map(OrderItemRequest::toCommand).toList(),
          expectedTotalCents);
    }
  }

  public record OrderItemRequest(
      UUID productId,
      UUID variantId,
      @NotNull @Min(1) Integer quantity,
      @Size(max = 500) String notes,
      @Valid PizzaCompositionRequest pizza) {
    LineCommand toCommand() {
      return new LineCommand(productId, variantId, quantity, notes, pizza == null ? null : pizza.toCommand());
    }
  }

  public record PizzaCompositionRequest(
      @NotNull UUID sizeId, @NotEmpty List<UUID> flavorIds, UUID crustId, List<UUID> extraIds) {
    PizzaLine toCommand() {
      return new PizzaLine(sizeId, flavorIds, crustId, extraIds);
    }
  }

  public record AdvanceRequest(Integer version) {}

  public record OrderSummaryResponse(
      UUID id,
      UUID establishmentId,
      OrderChannel channel,
      UUID tableId,
      UUID tableServiceId,
      int number,
      String placedByName,
      int subtotalCents,
      int discountCents,
      int totalCents,
      CommercialStatus commercialStatus,
      ProductionStatus productionStatus,
      Instant placedAt) {
    static OrderSummaryResponse from(Order order) {
      return new OrderSummaryResponse(
          order.id(),
          order.establishmentId(),
          order.channel(),
          order.tableId(),
          order.tableServiceId(),
          order.number(),
          order.placedByName(),
          order.subtotalCents(),
          order.discountCents(),
          order.totalCents(),
          order.commercialStatus(),
          order.productionStatus(),
          order.placedAt());
    }
  }

  public record OrderResponse(
      UUID id,
      UUID establishmentId,
      OrderChannel channel,
      UUID tableId,
      UUID tableServiceId,
      int number,
      UUID placedByUserId,
      String placedByName,
      String notes,
      int subtotalCents,
      int discountCents,
      int totalCents,
      CommercialStatus commercialStatus,
      ProductionStatus productionStatus,
      Instant placedAt,
      UUID ticketId,
      List<OrderItemResponse> items) {}

  public record OrderItemResponse(
      UUID id,
      ProductKind kind,
      UUID productId,
      String productName,
      UUID variantId,
      String variantName,
      int quantity,
      int unitPriceCents,
      int lineTotalCents,
      String notes,
      PizzaSnapshotResponse pizza,
      ProductionStatus productionStatus,
      UUID ticketItemId,
      int ticketItemVersion) {}

  public record PizzaSnapshotResponse(
      UUID sizeId,
      String sizeCode,
      String sizeName,
      PricingStrategy strategy,
      PricedOptionResponse crust,
      List<FlavorSnapshotResponse> flavors,
      List<PricedOptionResponse> extras) {}

  public record FlavorSnapshotResponse(
      UUID flavorId, String name, int priceCents, int numerator, int denominator) {}

  public record PricedOptionResponse(UUID id, String name, int priceCents) {}

  public record TicketResponse(
      UUID id,
      UUID orderId,
      int number,
      String origin,
      ProductionStatus productionStatus,
      TicketPriority priority,
      int version,
      Instant createdAt,
      List<OrderItemResponse> items) {
    public static TicketResponse from(KitchenTicket ticket, List<OrderItemResponse> items) {
      return new TicketResponse(
          ticket.id(),
          ticket.orderId(),
          ticket.number(),
          ticket.origin(),
          ticket.productionStatus(),
          ticket.priority(),
          ticket.version(),
          ticket.createdAt(),
          items);
    }
  }

  public record PageResponse<T>(List<T> items, int page, int size, long total) {
    static <T> PageResponse<T> from(Page<T> page) {
      return new PageResponse<>(page.getContent(), page.getNumber(), page.getSize(), page.getTotalElements());
    }
  }

  static FlavorSnapshotResponse flavor(OrderItemFlavor flavor) {
    return new FlavorSnapshotResponse(
        flavor.flavorId(), flavor.flavorName(), flavor.priceCents(), flavor.numerator(), flavor.denominator());
  }

  static PricedOptionResponse extra(OrderItemModifier modifier) {
    return new PricedOptionResponse(modifier.extraId(), modifier.extraName(), modifier.priceCents());
  }

  static PizzaSnapshotResponse pizza(
      OrderItem item, List<OrderItemFlavor> flavors, List<OrderItemModifier> extras) {
    if (item.kind() != ProductKind.PIZZA) {
      return null;
    }
    PricedOptionResponse crust =
        item.pizzaCrustName() == null
            ? null
            : new PricedOptionResponse(
                item.pizzaCrustId(), item.pizzaCrustName(), item.pizzaCrustCents() == null ? 0 : item.pizzaCrustCents());
    return new PizzaSnapshotResponse(
        item.pizzaSizeId(),
        item.pizzaSizeCode(),
        item.pizzaSizeName(),
        item.pizzaStrategy(),
        crust,
        flavors.stream().map(OrderDtos::flavor).toList(),
        extras.stream().map(OrderDtos::extra).toList());
  }

  public static OrderItemResponse item(
      OrderItem item,
      List<OrderItemFlavor> flavors,
      List<OrderItemModifier> extras,
      KitchenTicketItem ticketItem) {
    return new OrderItemResponse(
        item.id(),
        item.kind(),
        item.productId(),
        item.productName(),
        item.variantId(),
        item.variantName(),
        item.quantity(),
        item.unitPriceCents(),
        item.lineTotalCents(),
        item.notes(),
        pizza(item, flavors, extras),
        ticketItem == null ? ProductionStatus.WAITING : ticketItem.productionStatus(),
        ticketItem == null ? null : ticketItem.id(),
        ticketItem == null ? 0 : ticketItem.version());
  }
}
