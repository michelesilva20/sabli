package dev.emilabs.sabli.cash.persistence;

import dev.emilabs.sabli.cash.domain.CashSession;
import dev.emilabs.sabli.cash.domain.CashSessionStatus;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CashSessionRepository extends JpaRepository<CashSession, UUID> {

  Optional<CashSession> findByIdAndEstablishmentId(UUID id, UUID establishmentId);

  Optional<CashSession> findByEstablishmentIdAndStatus(UUID establishmentId, CashSessionStatus status);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from CashSession s where s.id = :id and s.establishmentId = :establishmentId")
  Optional<CashSession> lockByIdAndEstablishmentId(
      @Param("id") UUID id, @Param("establishmentId") UUID establishmentId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from CashSession s where s.establishmentId = :establishmentId and s.status = :status")
  Optional<CashSession> lockByEstablishmentIdAndStatus(
      @Param("establishmentId") UUID establishmentId, @Param("status") CashSessionStatus status);

  Page<CashSession> findByEstablishmentIdOrderByOpenedAtDescIdDesc(UUID establishmentId, Pageable pageable);
}
