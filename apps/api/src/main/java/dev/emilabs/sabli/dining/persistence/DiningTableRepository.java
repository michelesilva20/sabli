package dev.emilabs.sabli.dining.persistence;

import dev.emilabs.sabli.dining.domain.DiningStatus;
import dev.emilabs.sabli.dining.domain.DiningTable;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DiningTableRepository extends JpaRepository<DiningTable, UUID> {

  Optional<DiningTable> findByIdAndEstablishmentId(UUID id, UUID establishmentId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select t from DiningTable t where t.id = :id and t.establishmentId = :establishmentId")
  Optional<DiningTable> lockByIdAndEstablishmentId(
      @Param("id") UUID id, @Param("establishmentId") UUID establishmentId);

  List<DiningTable> findByEstablishmentIdOrderByNumberAscIdAsc(UUID establishmentId);

  List<DiningTable> findByEstablishmentIdAndStatusOrderByNumberAscIdAsc(
      UUID establishmentId, DiningStatus status);

  boolean existsByEstablishmentIdAndNumber(UUID establishmentId, int number);

  boolean existsByEstablishmentIdAndNumberAndIdNot(UUID establishmentId, int number, UUID id);
}
