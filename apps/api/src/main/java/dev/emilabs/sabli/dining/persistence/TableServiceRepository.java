package dev.emilabs.sabli.dining.persistence;

import dev.emilabs.sabli.dining.domain.TableService;
import dev.emilabs.sabli.dining.domain.TableServiceStatus;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TableServiceRepository extends JpaRepository<TableService, UUID> {

  Optional<TableService> findByIdAndEstablishmentId(UUID id, UUID establishmentId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from TableService s where s.id = :id and s.establishmentId = :establishmentId")
  Optional<TableService> lockByIdAndEstablishmentId(
      @Param("id") UUID id, @Param("establishmentId") UUID establishmentId);

  Optional<TableService> findByTableIdAndEstablishmentIdAndStatusIn(
      UUID tableId, UUID establishmentId, Collection<TableServiceStatus> statuses);

  List<TableService> findByEstablishmentIdAndStatusIn(
      UUID establishmentId, Collection<TableServiceStatus> statuses);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select s from TableService s
      where s.tableId = :tableId
        and s.establishmentId = :establishmentId
        and s.status in :statuses
      """)
  Optional<TableService> lockActiveByTable(
      @Param("tableId") UUID tableId,
      @Param("establishmentId") UUID establishmentId,
      @Param("statuses") Collection<TableServiceStatus> statuses);

  Page<TableService> findByEstablishmentIdAndTableIdOrderByOpenedAtDescIdDesc(
      UUID establishmentId, UUID tableId, Pageable pageable);

  Page<TableService> findByEstablishmentIdOrderByOpenedAtDescIdDesc(UUID establishmentId, Pageable pageable);
}
