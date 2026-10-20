package dev.emilabs.sabli.billing.persistence;

import dev.emilabs.sabli.billing.domain.Bill;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BillRepository extends JpaRepository<Bill, UUID> {

  Optional<Bill> findByIdAndEstablishmentId(UUID id, UUID establishmentId);

  Optional<Bill> findByTableServiceIdAndEstablishmentId(UUID tableServiceId, UUID establishmentId);

  Optional<Bill> findByOrderIdAndEstablishmentId(UUID orderId, UUID establishmentId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select b from Bill b where b.id = :id and b.establishmentId = :establishmentId")
  Optional<Bill> lockByIdAndEstablishmentId(@Param("id") UUID id, @Param("establishmentId") UUID establishmentId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select b from Bill b where b.tableServiceId = :tableServiceId and b.establishmentId = :establishmentId")
  Optional<Bill> lockByTableServiceIdAndEstablishmentId(
      @Param("tableServiceId") UUID tableServiceId, @Param("establishmentId") UUID establishmentId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select b from Bill b where b.orderId = :orderId and b.establishmentId = :establishmentId")
  Optional<Bill> lockByOrderIdAndEstablishmentId(
      @Param("orderId") UUID orderId, @Param("establishmentId") UUID establishmentId);
}
