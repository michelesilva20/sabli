package dev.emilabs.sabli.orders.api;

import dev.emilabs.sabli.kitchen.domain.KitchenTicket;
import dev.emilabs.sabli.kitchen.domain.KitchenTicketItem;
import dev.emilabs.sabli.kitchen.domain.ProductionStatus;
import dev.emilabs.sabli.orders.api.OrderDtos.OrderItemResponse;
import dev.emilabs.sabli.orders.api.OrderDtos.OrderResponse;
import dev.emilabs.sabli.orders.api.OrderDtos.OrderSummaryResponse;
import dev.emilabs.sabli.orders.api.OrderDtos.PageResponse;
import dev.emilabs.sabli.orders.api.OrderDtos.PlaceOrderRequest;
import dev.emilabs.sabli.orders.application.OrderCommandService;
import dev.emilabs.sabli.orders.application.OrderCommandService.PlaceResult;
import dev.emilabs.sabli.orders.application.OrderQueryService;
import dev.emilabs.sabli.orders.application.OrderQueryService.OrderFilter;
import dev.emilabs.sabli.orders.domain.Order;
import dev.emilabs.sabli.orders.domain.OrderItem;
import dev.emilabs.sabli.orders.domain.OrderItemFlavor;
import dev.emilabs.sabli.orders.domain.OrderItemModifier;
import dev.emilabs.sabli.shared.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/establishments/{establishmentId}/orders")
@Tag(name = "Orders")
public class OrderController {

  private final CurrentUser currentUser;
  private final OrderCommandService commands;
  private final OrderQueryService queries;

  public OrderController(CurrentUser currentUser, OrderCommandService commands, OrderQueryService queries) {
    this.currentUser = currentUser;
    this.commands = commands;
    this.queries = queries;
  }

  @PostMapping
  @Operation(summary = "Cria e confirma pedido com preço do servidor")
  public ResponseEntity<OrderResponse> place(
      @PathVariable UUID establishmentId,
      @RequestHeader(name = "Idempotency-Key") String idempotencyKey,
      @Valid @RequestBody PlaceOrderRequest request) {
    PlaceResult result =
        commands.place(currentUser.requireUserId(), establishmentId, idempotencyKey, request.toCommand());
    return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK)
        .body(toResponse(establishmentId, result.order()));
  }

  @GetMapping
  @Operation(summary = "Lista pedidos do estabelecimento")
  public PageResponse<OrderSummaryResponse> list(
      @PathVariable UUID establishmentId,
      @RequestParam(required = false) UUID tableServiceId,
      @RequestParam(required = false) ProductionStatus productionStatus,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return PageResponse.from(
        queries
            .list(
                currentUser.requireUserId(),
                establishmentId,
                new OrderFilter(tableServiceId, productionStatus, page, size))
            .map(OrderSummaryResponse::from));
  }

  @GetMapping("/{orderId}")
  @Operation(summary = "Consulta pedido, itens e composição congelada")
  public OrderResponse get(@PathVariable UUID establishmentId, @PathVariable UUID orderId) {
    return toResponse(establishmentId, queries.get(currentUser.requireUserId(), establishmentId, orderId));
  }

  private OrderResponse toResponse(UUID establishmentId, Order order) {
    List<OrderItem> lines = queries.items(order.id());
    List<UUID> itemIds = lines.stream().map(OrderItem::id).toList();
    Map<UUID, List<OrderItemFlavor>> flavors = queries.flavorsByItem(itemIds);
    Map<UUID, List<OrderItemModifier>> extras = queries.modifiersByItem(itemIds);
    KitchenTicket ticket = queries.ticketForOrder(establishmentId, order.id());
    Map<UUID, KitchenTicketItem> ticketItemByOrderItem =
        ticket == null
            ? Map.of()
            : queries.ticketItems(ticket.id()).stream()
                .collect(Collectors.toMap(KitchenTicketItem::orderItemId, Function.identity()));
    List<OrderItemResponse> items =
        lines.stream()
            .map(
                item ->
                    OrderDtos.item(
                        item,
                        flavors.getOrDefault(item.id(), List.of()),
                        extras.getOrDefault(item.id(), List.of()),
                        ticketItemByOrderItem.get(item.id())))
            .toList();
    return new OrderResponse(
        order.id(),
        order.establishmentId(),
        order.channel(),
        order.tableId(),
        order.tableServiceId(),
        order.number(),
        order.placedByUserId(),
        order.placedByName(),
        order.notes(),
        order.subtotalCents(),
        order.discountCents(),
        order.totalCents(),
        order.commercialStatus(),
        order.productionStatus(),
        order.placedAt(),
        ticket == null ? null : ticket.id(),
        items);
  }
}
