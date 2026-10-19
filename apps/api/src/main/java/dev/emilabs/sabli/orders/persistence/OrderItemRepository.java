package dev.emilabs.sabli.orders.persistence;

import dev.emilabs.sabli.orders.domain.OrderItem;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderItemRepository extends JpaRepository<OrderItem, UUID> {

  List<OrderItem> findByOrderIdOrderBySortOrderAscIdAsc(UUID orderId);

  List<OrderItem> findByOrderIdIn(Collection<UUID> orderIds);
}
