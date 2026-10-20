package dev.emilabs.sabli.orders.persistence;

import dev.emilabs.sabli.kitchen.domain.ProductionStatus;
import dev.emilabs.sabli.orders.domain.Order;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<Order, UUID> {

  Optional<Order> findByIdAndEstablishmentId(UUID id, UUID establishmentId);

  Optional<Order> findByEstablishmentIdAndPlacedByUserIdAndIdempotencyKey(
      UUID establishmentId, UUID placedByUserId, String idempotencyKey);

  Page<Order> findByEstablishmentIdOrderByPlacedAtDescIdDesc(UUID establishmentId, Pageable pageable);

  Page<Order> findByEstablishmentIdAndTableServiceIdOrderByPlacedAtDescIdDesc(
      UUID establishmentId, UUID tableServiceId, Pageable pageable);

  Page<Order> findByEstablishmentIdAndProductionStatusOrderByPlacedAtDescIdDesc(
      UUID establishmentId, ProductionStatus productionStatus, Pageable pageable);

  List<Order> findByEstablishmentIdAndTableServiceIdOrderByPlacedAtAscIdAsc(
      UUID establishmentId, UUID tableServiceId);

  boolean existsByEstablishmentIdAndTableServiceId(UUID establishmentId, UUID tableServiceId);
}
