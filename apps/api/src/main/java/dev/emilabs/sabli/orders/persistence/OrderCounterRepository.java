package dev.emilabs.sabli.orders.persistence;

import dev.emilabs.sabli.orders.domain.OrderCounter;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderCounterRepository extends JpaRepository<OrderCounter, UUID> {

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select c from OrderCounter c where c.establishmentId = :establishmentId")
  Optional<OrderCounter> lockByEstablishmentId(@Param("establishmentId") UUID establishmentId);

  @Modifying
  @Query(
      value =
          """
          insert into order_counters (establishment_id, organization_id, last_number)
          values (:establishmentId, :organizationId, 0)
          on conflict (establishment_id) do nothing
          """,
      nativeQuery = true)
  void ensureExists(
      @Param("establishmentId") UUID establishmentId, @Param("organizationId") UUID organizationId);
}
