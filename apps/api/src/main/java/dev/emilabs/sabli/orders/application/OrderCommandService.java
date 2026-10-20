package dev.emilabs.sabli.orders.application;

import dev.emilabs.sabli.catalog.application.PizzaCatalogService.QuoteSnapshot;
import dev.emilabs.sabli.catalog.pricing.PizzaPricer.PricedItem;
import dev.emilabs.sabli.dining.domain.DiningTable;
import dev.emilabs.sabli.dining.domain.TableService;
import dev.emilabs.sabli.dining.domain.TableServiceStatus;
import dev.emilabs.sabli.dining.persistence.DiningTableRepository;
import dev.emilabs.sabli.dining.persistence.TableServiceRepository;
import dev.emilabs.sabli.identity.domain.Establishment;
import dev.emilabs.sabli.identity.domain.UserAccount;
import dev.emilabs.sabli.identity.persistence.UserAccountRepository;
import dev.emilabs.sabli.kitchen.domain.KitchenTicket;
import dev.emilabs.sabli.kitchen.domain.KitchenTicketItem;
import dev.emilabs.sabli.kitchen.persistence.KitchenTicketItemRepository;
import dev.emilabs.sabli.kitchen.persistence.KitchenTicketRepository;
import dev.emilabs.sabli.orders.domain.Order;
import dev.emilabs.sabli.orders.domain.OrderChannel;
import dev.emilabs.sabli.orders.domain.OrderCounter;
import dev.emilabs.sabli.orders.domain.OrderItem;
import dev.emilabs.sabli.orders.domain.OrderItemFlavor;
import dev.emilabs.sabli.orders.domain.OrderItemModifier;
import dev.emilabs.sabli.orders.persistence.OrderCounterRepository;
import dev.emilabs.sabli.orders.persistence.OrderItemFlavorRepository;
import dev.emilabs.sabli.orders.persistence.OrderItemModifierRepository;
import dev.emilabs.sabli.orders.persistence.OrderItemRepository;
import dev.emilabs.sabli.orders.persistence.OrderRepository;
import dev.emilabs.sabli.shared.error.ApiException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class OrderCommandService {

  private final OrderAccess access;
  private final OrderPricing pricing;
  private final OrderRepository orders;
  private final OrderItemRepository items;
  private final OrderItemFlavorRepository flavors;
  private final OrderItemModifierRepository modifiers;
  private final OrderCounterRepository counters;
  private final TableServiceRepository services;
  private final DiningTableRepository tables;
  private final UserAccountRepository users;
  private final KitchenTicketRepository tickets;
  private final KitchenTicketItemRepository ticketItems;
  private final TransactionTemplate transactions;

  public OrderCommandService(
      OrderAccess access,
      OrderPricing pricing,
      OrderRepository orders,
      OrderItemRepository items,
      OrderItemFlavorRepository flavors,
      OrderItemModifierRepository modifiers,
      OrderCounterRepository counters,
      TableServiceRepository services,
      DiningTableRepository tables,
      UserAccountRepository users,
      KitchenTicketRepository tickets,
      KitchenTicketItemRepository ticketItems,
      PlatformTransactionManager transactionManager) {
    this.access = access;
    this.pricing = pricing;
    this.orders = orders;
    this.items = items;
    this.flavors = flavors;
    this.modifiers = modifiers;
    this.counters = counters;
    this.services = services;
    this.tables = tables;
    this.users = users;
    this.tickets = tickets;
    this.ticketItems = ticketItems;
    this.transactions = new TransactionTemplate(transactionManager);
  }

  public PlaceResult place(UUID userId, UUID establishmentId, String idempotencyKey, PlaceCommand command) {
    Establishment establishment = access.requirePlace(userId, establishmentId);
    if (idempotencyKey == null || idempotencyKey.isBlank()) {
      throw ApiException.badRequest("Informe a chave de idempotência.");
    }
    String key = idempotencyKey.trim();
    if (key.length() > 80) {
      throw ApiException.badRequest("A chave de idempotência é longa demais.");
    }
    if (command.items() == null || command.items().isEmpty()) {
      throw ApiException.unprocessable("ITEMS_REQUIRED", "O pedido precisa de ao menos um item.");
    }
    PlaceCommand normalized = normalize(command);
    String hash = Idempotency.hash(normalized);
    PlaceResult replay = replayIfPresent(establishmentId, userId, key, hash);
    if (replay != null) {
      return replay;
    }
    try {
      return transactions.execute(status -> confirmNew(userId, establishment, key, hash, normalized));
    } catch (RuntimeException ex) {
      PlaceResult recovered = waitForReplay(establishmentId, userId, key, hash);
      if (recovered != null) {
        return recovered;
      }
      throw ex;
    }
  }

  private PlaceResult waitForReplay(UUID establishmentId, UUID userId, String key, String hash) {
    for (int attempt = 0; attempt < 20; attempt++) {
      PlaceResult recovered = replayIfPresent(establishmentId, userId, key, hash);
      if (recovered != null) {
        return recovered;
      }
      try {
        Thread.sleep(25);
      } catch (InterruptedException interrupted) {
        Thread.currentThread().interrupt();
        return null;
      }
    }
    return replayIfPresent(establishmentId, userId, key, hash);
  }

  private PlaceResult replayIfPresent(UUID establishmentId, UUID userId, String key, String hash) {
    Order existing =
        orders
            .findByEstablishmentIdAndPlacedByUserIdAndIdempotencyKey(establishmentId, userId, key)
            .orElse(null);
    if (existing == null) {
      return null;
    }
    if (!existing.idempotencyHash().equals(hash)) {
      throw ApiException.conflict("IDEMPOTENCY_CONFLICT", "A mesma chave foi usada com outro pedido.");
    }
    return new PlaceResult(existing, false);
  }

  private PlaceResult confirmNew(
      UUID userId, Establishment establishment, String key, String hash, PlaceCommand normalized) {
    PlaceResult replay = replayIfPresent(establishment.id(), userId, key, hash);
    if (replay != null) {
      return replay;
    }
    TableBinding binding = resolveChannel(establishment.id(), normalized);
    UserAccount user = users.findById(userId).orElseThrow(ApiException::notFound);
    List<PricedPlacement> priced = new ArrayList<>();
    int subtotal = 0;
    int sort = 0;
    for (LineCommand line : normalized.items()) {
      var pricedLine = pricing.price(userId, establishment.id(), line);
      priced.add(new PricedPlacement(sort++, line, pricedLine));
      subtotal += pricedLine.unitCents() * line.quantity();
    }
    if (normalized.expectedTotalCents() != null && normalized.expectedTotalCents() != subtotal) {
      throw ApiException.priceChanged(normalized.expectedTotalCents(), subtotal);
    }
    int number = nextNumber(establishment);
    Order order =
        Order.confirm(
            establishment.id(),
            establishment.organizationId(),
            normalized.channel(),
            binding.tableId(),
            binding.serviceId(),
            number,
            user.id(),
            user.name(),
            normalized.notes(),
            subtotal,
            key,
            hash);
    orders.saveAndFlush(order);
    persistLines(order, priced);
    String origin = origin(normalized.channel(), binding.table());
    KitchenTicket ticket =
        tickets.save(
            KitchenTicket.open(
                order.id(), establishment.id(), establishment.organizationId(), order.number(), origin));
    for (OrderItem item : items.findByOrderIdOrderBySortOrderAscIdAsc(order.id())) {
      ticketItems.save(
          KitchenTicketItem.waiting(ticket.id(), item.id(), establishment.id(), establishment.organizationId()));
    }
    return new PlaceResult(order, true);
  }

  private void persistLines(Order order, List<PricedPlacement> priced) {
    for (PricedPlacement placement : priced) {
      LineCommand line = placement.line();
      OrderPricing.PricedLine pricedLine = placement.priced();
      if (pricedLine.isPizza()) {
        QuoteSnapshot quote = pricedLine.quote();
        OrderItem item =
            items.save(
                OrderItem.pizza(
                    order.id(),
                    order.establishmentId(),
                    order.organizationId(),
                    placement.sortOrder(),
                    pricedLine.productId(),
                    pricedLine.productName(),
                    line.quantity(),
                    pricedLine.unitCents(),
                    line.notes(),
                    quote.size().id(),
                    quote.size().code(),
                    quote.size().name(),
                    quote.result().strategy(),
                    quote.crust() == null ? null : quote.crust().id(),
                    quote.crust() == null ? null : quote.crust().name(),
                    quote.crust() == null ? null : quote.crust().priceCents()));
        int flavorsCount = quote.flavorItems().size();
        int position = 0;
        for (PricedItem flavor : quote.flavorItems()) {
          UUID flavorId = UUID.fromString(flavor.id());
          flavors.save(
              OrderItemFlavor.snapshot(
                  item.id(),
                  order.establishmentId(),
                  position,
                  flavorId,
                  flavor.name(),
                  flavor.cents(),
                  1,
                  flavorsCount));
          position++;
        }
        int extraPosition = 0;
        for (PricedItem extra : quote.extraItems()) {
          modifiers.save(
              OrderItemModifier.snapshot(
                  item.id(),
                  order.establishmentId(),
                  extraPosition,
                  UUID.fromString(extra.id()),
                  extra.name(),
                  extra.cents()));
          extraPosition++;
        }
      } else {
        items.save(
            OrderItem.standard(
                order.id(),
                order.establishmentId(),
                order.organizationId(),
                placement.sortOrder(),
                pricedLine.productId(),
                pricedLine.productName(),
                pricedLine.variant().id(),
                pricedLine.variant().name(),
                line.quantity(),
                pricedLine.unitCents(),
                line.notes()));
      }
    }
  }

  private int nextNumber(Establishment establishment) {
    counters.ensureExists(establishment.id(), establishment.organizationId());
    OrderCounter counter =
        counters.lockByEstablishmentId(establishment.id()).orElseThrow(ApiException::notFound);
    return counter.next();
  }

  private TableBinding resolveChannel(UUID establishmentId, PlaceCommand command) {
    if (command.channel() == OrderChannel.COUNTER) {
      if (command.tableServiceId() != null) {
        throw ApiException.badRequest("Pedido de balcão não aceita atendimento de mesa.");
      }
      return new TableBinding(null, null, null);
    }
    if (command.tableServiceId() == null) {
      throw ApiException.unprocessable("SERVICE_REQUIRED", "Pedido de mesa exige um atendimento ativo.");
    }
    TableService service =
        services
            .lockByIdAndEstablishmentId(command.tableServiceId(), establishmentId)
            .orElseThrow(ApiException::notFound);
    if (service.billingStarted()) {
      throw ApiException.unprocessable(
          "PAYMENT_STARTED", "Não é possível incluir pedido depois que o pagamento foi iniciado.");
    }
    if (service.status() == TableServiceStatus.AWAITING_BILL) {
      throw ApiException.unprocessable(
          "SERVICE_AWAITING_BILL", "Não é possível incluir pedido com a conta solicitada.");
    }
    if (service.status() != TableServiceStatus.OPEN) {
      throw ApiException.unprocessable("SERVICE_NOT_OPEN", "O atendimento não está aberto.");
    }
    DiningTable table =
        tables
            .findByIdAndEstablishmentId(service.tableId(), establishmentId)
            .orElseThrow(ApiException::notFound);
    return new TableBinding(table.id(), service.id(), table);
  }

  private static PlaceCommand normalize(PlaceCommand command) {
    OrderChannel channel =
        command.channel() == null
            ? (command.tableServiceId() == null ? OrderChannel.COUNTER : OrderChannel.TABLE)
            : command.channel();
    return new PlaceCommand(
        channel, command.tableServiceId(), command.notes(), command.items(), command.expectedTotalCents());
  }

  private static String origin(OrderChannel channel, DiningTable table) {
    if (channel == OrderChannel.COUNTER || table == null) {
      return "Balcão";
    }
    return "Mesa " + String.format("%02d", table.number());
  }

  public record PlaceCommand(
      OrderChannel channel,
      UUID tableServiceId,
      String notes,
      List<LineCommand> items,
      Integer expectedTotalCents) {}

  public record LineCommand(UUID productId, UUID variantId, int quantity, String notes, PizzaLine pizza) {}

  public record PizzaLine(UUID sizeId, List<UUID> flavorIds, UUID crustId, List<UUID> extraIds) {}

  public record PlaceResult(Order order, boolean created) {}

  private record TableBinding(UUID tableId, UUID serviceId, DiningTable table) {}

  private record PricedPlacement(int sortOrder, LineCommand line, OrderPricing.PricedLine priced) {}
}
