package dev.emilabs.sabli.kitchen.persistence;

import dev.emilabs.sabli.kitchen.domain.KitchenTicket;
import dev.emilabs.sabli.kitchen.domain.ProductionStatus;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface KitchenTicketRepository extends JpaRepository<KitchenTicket, UUID> {

  Optional<KitchenTicket> findByIdAndEstablishmentId(UUID id, UUID establishmentId);

  Optional<KitchenTicket> findByOrderIdAndEstablishmentId(UUID orderId, UUID establishmentId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select t from KitchenTicket t where t.id = :id and t.establishmentId = :establishmentId")
  Optional<KitchenTicket> lockByIdAndEstablishmentId(
      @Param("id") UUID id, @Param("establishmentId") UUID establishmentId);

  Page<KitchenTicket> findByEstablishmentIdOrderByCreatedAtDescIdDesc(UUID establishmentId, Pageable pageable);

  Page<KitchenTicket> findByEstablishmentIdAndProductionStatusOrderByCreatedAtDescIdDesc(
      UUID establishmentId, ProductionStatus productionStatus, Pageable pageable);
}
