package dev.emilabs.sabli.orders.persistence;

import dev.emilabs.sabli.orders.domain.OrderItemModifier;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderItemModifierRepository extends JpaRepository<OrderItemModifier, UUID> {

  List<OrderItemModifier> findByItemIdInOrderByPositionAsc(Collection<UUID> itemIds);
}
