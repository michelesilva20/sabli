package dev.emilabs.sabli.billing.api;

import dev.emilabs.sabli.billing.api.BillingDtos.BillOrderResponse;
import dev.emilabs.sabli.billing.api.BillingDtos.BillResponse;
import dev.emilabs.sabli.billing.api.BillingDtos.PaymentPageResponse;
import dev.emilabs.sabli.billing.api.BillingDtos.PaymentResponse;
import dev.emilabs.sabli.billing.api.BillingDtos.RegisterPaymentRequest;
import dev.emilabs.sabli.billing.application.BillingCommandService;
import dev.emilabs.sabli.billing.application.BillingCommandService.PayResult;
import dev.emilabs.sabli.billing.application.BillingQueryService;
import dev.emilabs.sabli.billing.application.BillingQueryService.BillView;
import dev.emilabs.sabli.kitchen.domain.KitchenTicket;
import dev.emilabs.sabli.kitchen.domain.KitchenTicketItem;
import dev.emilabs.sabli.orders.api.OrderDtos;
import dev.emilabs.sabli.orders.api.OrderDtos.OrderItemResponse;
import dev.emilabs.sabli.orders.application.OrderQueryService;
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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/establishments/{establishmentId}")
@Tag(name = "Billing")
public class BillController {

  private final CurrentUser currentUser;
  private final BillingQueryService queries;
  private final BillingCommandService commands;
  private final OrderQueryService orders;

  public BillController(
      CurrentUser currentUser,
      BillingQueryService queries,
      BillingCommandService commands,
      OrderQueryService orders) {
    this.currentUser = currentUser;
    this.queries = queries;
    this.commands = commands;
    this.orders = orders;
  }

  @GetMapping("/table-services/{tableServiceId}/bill")
  @Operation(summary = "Consulta a comanda do atendimento")
  public BillResponse byService(@PathVariable UUID establishmentId, @PathVariable UUID tableServiceId) {
    return toResponse(queries.byService(currentUser.requireUserId(), establishmentId, tableServiceId));
  }

  @GetMapping("/orders/{orderId}/bill")
  @Operation(summary = "Consulta a conta do pedido de balcão")
  public BillResponse byOrder(@PathVariable UUID establishmentId, @PathVariable UUID orderId) {
    return toResponse(queries.byOrder(currentUser.requireUserId(), establishmentId, orderId));
  }

  @GetMapping("/bills/{billId}")
  @Operation(summary = "Consulta conta, saldo e quitação")
  public BillResponse get(@PathVariable UUID establishmentId, @PathVariable UUID billId) {
    return toResponse(queries.get(currentUser.requireUserId(), establishmentId, billId));
  }

  @GetMapping("/bills/{billId}/payments")
  @Operation(summary = "Lista pagamentos da conta")
  public PaymentPageResponse payments(@PathVariable UUID establishmentId, @PathVariable UUID billId) {
    return new PaymentPageResponse(
        queries.payments(currentUser.requireUserId(), establishmentId, billId).stream()
            .map(PaymentResponse::from)
            .toList());
  }

  @PostMapping("/bills/{billId}/payments")
  @Operation(summary = "Registra pagamento informado pelo operador, sem adquirente")
  public ResponseEntity<PaymentResponse> pay(
      @PathVariable UUID establishmentId,
      @PathVariable UUID billId,
      @RequestHeader(name = "Idempotency-Key") String idempotencyKey,
      @Valid @RequestBody RegisterPaymentRequest request) {
    PayResult result =
        commands.pay(currentUser.requireUserId(), establishmentId, billId, idempotencyKey, request.toCommand());
    return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK)
        .body(PaymentResponse.from(result.payment()));
  }

  private BillResponse toResponse(BillView view) {
    List<BillOrderResponse> orderResponses =
        view.orders().stream().map(order -> toOrder(view.bill().establishmentId(), order)).toList();
    return BillResponse.from(view, orderResponses);
  }

  private BillOrderResponse toOrder(UUID establishmentId, Order order) {
    List<OrderItem> lines = orders.items(order.id());
    List<UUID> itemIds = lines.stream().map(OrderItem::id).toList();
    Map<UUID, List<OrderItemFlavor>> flavors = orders.flavorsByItem(itemIds);
    Map<UUID, List<OrderItemModifier>> extras = orders.modifiersByItem(itemIds);
    KitchenTicket ticket = orders.ticketForOrder(establishmentId, order.id());
    Map<UUID, KitchenTicketItem> ticketItemByOrderItem =
        ticket == null
            ? Map.of()
            : orders.ticketItems(ticket.id()).stream()
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
    return new BillOrderResponse(
        order.id(),
        order.number(),
        order.subtotalCents(),
        order.discountCents(),
        order.totalCents(),
        order.placedAt(),
        items);
  }
}
