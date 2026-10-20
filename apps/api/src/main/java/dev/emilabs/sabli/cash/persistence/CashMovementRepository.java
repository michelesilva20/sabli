package dev.emilabs.sabli.cash.persistence;

import dev.emilabs.sabli.cash.domain.CashMovement;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CashMovementRepository extends JpaRepository<CashMovement, UUID> {

  List<CashMovement> findByCashSessionIdOrderByRecordedAtAscIdAsc(UUID cashSessionId);
}
