package dev.emilabs.sabli.kitchen.application;

import dev.emilabs.sabli.kitchen.domain.KitchenTicket;
import dev.emilabs.sabli.kitchen.domain.KitchenTicketItem;
import dev.emilabs.sabli.kitchen.domain.ProductionStatus;
import dev.emilabs.sabli.kitchen.persistence.KitchenTicketItemRepository;
import dev.emilabs.sabli.kitchen.persistence.KitchenTicketRepository;
import dev.emilabs.sabli.orders.application.OrderAccess;
import dev.emilabs.sabli.orders.domain.Order;
import dev.emilabs.sabli.orders.persistence.OrderRepository;
import dev.emilabs.sabli.shared.error.ApiException;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class KitchenCommandService {

  private final OrderAccess access;
  private final KitchenTicketRepository tickets;
  private final KitchenTicketItemRepository ticketItems;
  private final OrderRepository orders;

  public KitchenCommandService(
      OrderAccess access,
      KitchenTicketRepository tickets,
      KitchenTicketItemRepository ticketItems,
      OrderRepository orders) {
    this.access = access;
    this.tickets = tickets;
    this.ticketItems = ticketItems;
    this.orders = orders;
  }

  @Transactional
  public KitchenTicket advanceItem(
      UUID userId, UUID establishmentId, UUID ticketId, UUID itemId, Integer version) {
    access.requireKitchen(userId, establishmentId);
    KitchenTicket ticket = lockTicket(establishmentId, ticketId);
    KitchenTicketItem item =
        ticketItems
            .lockByIdAndTicket(itemId, ticketId, establishmentId)
            .orElseThrow(ApiException::notFound);
    if (version != null && version != item.version()) {
      throw ApiException.staleVersion();
    }
    if (item.productionStatus().next() == null) {
      throw ApiException.unprocessable("INVALID_TRANSITION", "O item já foi entregue.");
    }
    item.advance();
    sync(ticket);
    return ticket;
  }

  @Transactional
  public KitchenTicket advanceTicket(UUID userId, UUID establishmentId, UUID ticketId, Integer version) {
    access.requireKitchen(userId, establishmentId);
    KitchenTicket ticket = lockTicket(establishmentId, ticketId);
    if (version != null && version != ticket.version()) {
      throw ApiException.staleVersion();
    }
    List<KitchenTicketItem> items = ticketItems.lockByTicketId(ticketId);
    ProductionStatus current = ProductionStatus.aggregate(items.stream().map(KitchenTicketItem::productionStatus).toList());
    ProductionStatus next = current.next();
    if (next == null) {
      throw ApiException.unprocessable("INVALID_TRANSITION", "O ticket já foi entregue.");
    }
    for (KitchenTicketItem item : items) {
      if (item.productionStatus() == current) {
        item.advance();
      }
    }
    sync(ticket);
    return ticket;
  }

  private KitchenTicket lockTicket(UUID establishmentId, UUID ticketId) {
    return tickets.lockByIdAndEstablishmentId(ticketId, establishmentId).orElseThrow(ApiException::notFound);
  }

  private void sync(KitchenTicket ticket) {
    List<KitchenTicketItem> items = ticketItems.findByTicketIdOrderByCreatedAtAscIdAsc(ticket.id());
    ProductionStatus aggregate =
        ProductionStatus.aggregate(items.stream().map(KitchenTicketItem::productionStatus).toList());
    ticket.syncProduction(aggregate);
    Order order =
        orders.findByIdAndEstablishmentId(ticket.orderId(), ticket.establishmentId()).orElseThrow(ApiException::notFound);
    order.syncProduction(aggregate);
  }
}
