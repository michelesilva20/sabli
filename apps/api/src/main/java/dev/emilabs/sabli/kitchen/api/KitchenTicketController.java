package dev.emilabs.sabli.kitchen.api;

import dev.emilabs.sabli.kitchen.application.KitchenCommandService;
import dev.emilabs.sabli.kitchen.application.KitchenQueryService;
import dev.emilabs.sabli.kitchen.domain.KitchenTicket;
import dev.emilabs.sabli.kitchen.domain.KitchenTicketItem;
import dev.emilabs.sabli.kitchen.domain.ProductionStatus;
import dev.emilabs.sabli.orders.api.OrderDtos;
import dev.emilabs.sabli.orders.api.OrderDtos.AdvanceRequest;
import dev.emilabs.sabli.orders.api.OrderDtos.OrderItemResponse;
import dev.emilabs.sabli.orders.api.OrderDtos.PageResponse;
import dev.emilabs.sabli.orders.api.OrderDtos.TicketResponse;
import dev.emilabs.sabli.orders.application.OrderQueryService;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/establishments/{establishmentId}/kitchen/tickets")
@Tag(name = "Kitchen")
public class KitchenTicketController {

  private final CurrentUser currentUser;
  private final KitchenQueryService queries;
  private final KitchenCommandService commands;
  private final OrderQueryService orders;

  public KitchenTicketController(
      CurrentUser currentUser,
      KitchenQueryService queries,
      KitchenCommandService commands,
      OrderQueryService orders) {
    this.currentUser = currentUser;
    this.queries = queries;
    this.commands = commands;
    this.orders = orders;
  }

  @GetMapping
  @Operation(summary = "Lista a fila da cozinha")
  public PageResponse<TicketResponse> list(
      @PathVariable UUID establishmentId,
      @RequestParam(required = false) ProductionStatus productionStatus,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "50") int size) {
    var tickets =
        queries.list(currentUser.requireUserId(), establishmentId, productionStatus, page, size);
    return new PageResponse<>(
        tickets.getContent().stream().map(ticket -> toResponse(ticket, false)).toList(),
        tickets.getNumber(),
        tickets.getSize(),
        tickets.getTotalElements());
  }

  @GetMapping("/{ticketId}")
  @Operation(summary = "Consulta ticket e composição dos itens")
  public TicketResponse get(@PathVariable UUID establishmentId, @PathVariable UUID ticketId) {
    return toResponse(queries.get(currentUser.requireUserId(), establishmentId, ticketId), true);
  }

  @PostMapping("/{ticketId}/advance")
  @Operation(summary = "Avança itens no estado agregado atual do ticket")
  public TicketResponse advanceTicket(
      @PathVariable UUID establishmentId,
      @PathVariable UUID ticketId,
      @Valid @RequestBody(required = false) AdvanceRequest request) {
    Integer version = request == null ? null : request.version();
    return toResponse(
        commands.advanceTicket(currentUser.requireUserId(), establishmentId, ticketId, version), true);
  }

  @PostMapping("/{ticketId}/items/{itemId}/advance")
  @Operation(summary = "Avança um item do ticket")
  public TicketResponse advanceItem(
      @PathVariable UUID establishmentId,
      @PathVariable UUID ticketId,
      @PathVariable UUID itemId,
      @Valid @RequestBody(required = false) AdvanceRequest request) {
    Integer version = request == null ? null : request.version();
    return toResponse(
        commands.advanceItem(currentUser.requireUserId(), establishmentId, ticketId, itemId, version), true);
  }

  private TicketResponse toResponse(KitchenTicket ticket, boolean includeComposition) {
    List<KitchenTicketItem> ticketItems = queries.items(ticket.id());
    if (!includeComposition) {
      List<OrderItemResponse> summaries =
          ticketItems.stream()
              .map(
                  item ->
                      new OrderItemResponse(
                          item.orderItemId(),
                          null,
                          null,
                          null,
                          null,
                          null,
                          0,
                          0,
                          0,
                          null,
                          null,
                          item.productionStatus(),
                          item.id(),
                          item.version()))
              .toList();
      return TicketResponse.from(ticket, summaries);
    }
    List<OrderItem> lines = orders.items(ticket.orderId());
    Map<UUID, OrderItem> byId = lines.stream().collect(Collectors.toMap(OrderItem::id, Function.identity()));
    List<UUID> itemIds = lines.stream().map(OrderItem::id).toList();
    Map<UUID, List<OrderItemFlavor>> flavors = orders.flavorsByItem(itemIds);
    Map<UUID, List<OrderItemModifier>> extras = orders.modifiersByItem(itemIds);
    List<OrderItemResponse> items =
        ticketItems.stream()
            .map(
                ticketItem -> {
                  OrderItem line = byId.get(ticketItem.orderItemId());
                  return OrderDtos.item(
                      line,
                      flavors.getOrDefault(line.id(), List.of()),
                      extras.getOrDefault(line.id(), List.of()),
                      ticketItem);
                })
            .toList();
    return TicketResponse.from(ticket, items);
  }
}
