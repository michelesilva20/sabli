package dev.emilabs.sabli.orders.application;

import dev.emilabs.sabli.kitchen.domain.KitchenTicket;
import dev.emilabs.sabli.kitchen.domain.KitchenTicketItem;
import dev.emilabs.sabli.kitchen.domain.ProductionStatus;
import dev.emilabs.sabli.kitchen.persistence.KitchenTicketItemRepository;
import dev.emilabs.sabli.kitchen.persistence.KitchenTicketRepository;
import dev.emilabs.sabli.orders.domain.Order;
import dev.emilabs.sabli.orders.domain.OrderItem;
import dev.emilabs.sabli.orders.domain.OrderItemFlavor;
import dev.emilabs.sabli.orders.domain.OrderItemModifier;
import dev.emilabs.sabli.orders.persistence.OrderItemFlavorRepository;
import dev.emilabs.sabli.orders.persistence.OrderItemModifierRepository;
import dev.emilabs.sabli.orders.persistence.OrderItemRepository;
import dev.emilabs.sabli.orders.persistence.OrderRepository;
import dev.emilabs.sabli.shared.error.ApiException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderQueryService {

  private final OrderAccess access;
  private final OrderRepository orders;
  private final OrderItemRepository items;
  private final OrderItemFlavorRepository flavors;
  private final OrderItemModifierRepository modifiers;
  private final KitchenTicketRepository tickets;
  private final KitchenTicketItemRepository ticketItems;

  public OrderQueryService(
      OrderAccess access,
      OrderRepository orders,
      OrderItemRepository items,
      OrderItemFlavorRepository flavors,
      OrderItemModifierRepository modifiers,
      KitchenTicketRepository tickets,
      KitchenTicketItemRepository ticketItems) {
    this.access = access;
    this.orders = orders;
    this.items = items;
    this.flavors = flavors;
    this.modifiers = modifiers;
    this.tickets = tickets;
    this.ticketItems = ticketItems;
  }

  @Transactional(readOnly = true)
  public Page<Order> list(UUID userId, UUID establishmentId, OrderFilter filter) {
    access.requireRead(userId, establishmentId);
    PageRequest page = PageRequest.of(Math.max(filter.page(), 0), Math.min(Math.max(filter.size(), 1), 100));
    if (filter.tableServiceId() != null) {
      return orders.findByEstablishmentIdAndTableServiceIdOrderByPlacedAtDescIdDesc(
          establishmentId, filter.tableServiceId(), page);
    }
    if (filter.productionStatus() != null) {
      return orders.findByEstablishmentIdAndProductionStatusOrderByPlacedAtDescIdDesc(
          establishmentId, filter.productionStatus(), page);
    }
    return orders.findByEstablishmentIdOrderByPlacedAtDescIdDesc(establishmentId, page);
  }

  @Transactional(readOnly = true)
  public Order get(UUID userId, UUID establishmentId, UUID orderId) {
    access.requireRead(userId, establishmentId);
    return orders.findByIdAndEstablishmentId(orderId, establishmentId).orElseThrow(ApiException::notFound);
  }

  @Transactional(readOnly = true)
  public List<OrderItem> items(UUID orderId) {
    return items.findByOrderIdOrderBySortOrderAscIdAsc(orderId);
  }

  @Transactional(readOnly = true)
  public Map<UUID, List<OrderItemFlavor>> flavorsByItem(List<UUID> itemIds) {
    if (itemIds.isEmpty()) {
      return Map.of();
    }
    return flavors.findByItemIdInOrderByPositionAsc(itemIds).stream()
        .collect(Collectors.groupingBy(OrderItemFlavor::itemId));
  }

  @Transactional(readOnly = true)
  public Map<UUID, List<OrderItemModifier>> modifiersByItem(List<UUID> itemIds) {
    if (itemIds.isEmpty()) {
      return Map.of();
    }
    return modifiers.findByItemIdInOrderByPositionAsc(itemIds).stream()
        .collect(Collectors.groupingBy(OrderItemModifier::itemId));
  }

  @Transactional(readOnly = true)
  public KitchenTicket ticketForOrder(UUID establishmentId, UUID orderId) {
    return tickets.findByOrderIdAndEstablishmentId(orderId, establishmentId).orElse(null);
  }

  @Transactional(readOnly = true)
  public List<KitchenTicketItem> ticketItems(UUID ticketId) {
    return ticketItems.findByTicketIdOrderByCreatedAtAscIdAsc(ticketId);
  }

  @Transactional(readOnly = true)
  public List<Order> forService(UUID userId, UUID establishmentId, UUID tableServiceId) {
    access.requireRead(userId, establishmentId);
    return orders.findByEstablishmentIdAndTableServiceIdOrderByPlacedAtAscIdAsc(establishmentId, tableServiceId);
  }

  public record OrderFilter(UUID tableServiceId, ProductionStatus productionStatus, int page, int size) {}
}
