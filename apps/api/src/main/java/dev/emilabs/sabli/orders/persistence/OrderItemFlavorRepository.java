package dev.emilabs.sabli.orders.persistence;

import dev.emilabs.sabli.orders.domain.OrderItemFlavor;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderItemFlavorRepository extends JpaRepository<OrderItemFlavor, UUID> {

  List<OrderItemFlavor> findByItemIdInOrderByPositionAsc(Collection<UUID> itemIds);
}
