package dev.emilabs.sabli.kitchen.application;

import dev.emilabs.sabli.kitchen.domain.KitchenTicket;
import dev.emilabs.sabli.kitchen.domain.KitchenTicketItem;
import dev.emilabs.sabli.kitchen.domain.ProductionStatus;
import dev.emilabs.sabli.kitchen.persistence.KitchenTicketItemRepository;
import dev.emilabs.sabli.kitchen.persistence.KitchenTicketRepository;
import dev.emilabs.sabli.orders.application.OrderAccess;
import dev.emilabs.sabli.shared.error.ApiException;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class KitchenQueryService {

  private final OrderAccess access;
  private final KitchenTicketRepository tickets;
  private final KitchenTicketItemRepository ticketItems;

  public KitchenQueryService(
      OrderAccess access, KitchenTicketRepository tickets, KitchenTicketItemRepository ticketItems) {
    this.access = access;
    this.tickets = tickets;
    this.ticketItems = ticketItems;
  }

  @Transactional(readOnly = true)
  public Page<KitchenTicket> list(
      UUID userId, UUID establishmentId, ProductionStatus productionStatus, int page, int size) {
    access.requireRead(userId, establishmentId);
    PageRequest request = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
    if (productionStatus == null) {
      return tickets.findByEstablishmentIdOrderByCreatedAtDescIdDesc(establishmentId, request);
    }
    return tickets.findByEstablishmentIdAndProductionStatusOrderByCreatedAtDescIdDesc(
        establishmentId, productionStatus, request);
  }

  @Transactional(readOnly = true)
  public KitchenTicket get(UUID userId, UUID establishmentId, UUID ticketId) {
    access.requireRead(userId, establishmentId);
    return tickets.findByIdAndEstablishmentId(ticketId, establishmentId).orElseThrow(ApiException::notFound);
  }

  @Transactional(readOnly = true)
  public List<KitchenTicketItem> items(UUID ticketId) {
    return ticketItems.findByTicketIdOrderByCreatedAtAscIdAsc(ticketId);
  }

  @Transactional(readOnly = true)
  public Map<UUID, List<KitchenTicketItem>> itemsByTicket(Collection<UUID> ticketIds) {
    if (ticketIds.isEmpty()) {
      return Map.of();
    }
    return ticketItems.findByTicketIdIn(ticketIds).stream().collect(Collectors.groupingBy(KitchenTicketItem::ticketId));
  }
}
