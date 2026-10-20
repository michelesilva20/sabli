package dev.emilabs.sabli.kitchen.persistence;

import dev.emilabs.sabli.kitchen.domain.KitchenTicketItem;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface KitchenTicketItemRepository extends JpaRepository<KitchenTicketItem, UUID> {

  List<KitchenTicketItem> findByTicketIdOrderByCreatedAtAscIdAsc(UUID ticketId);

  List<KitchenTicketItem> findByTicketIdIn(Collection<UUID> ticketIds);

  Optional<KitchenTicketItem> findByIdAndTicketIdAndEstablishmentId(
      UUID id, UUID ticketId, UUID establishmentId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select i from KitchenTicketItem i
      where i.id = :id and i.ticketId = :ticketId and i.establishmentId = :establishmentId
      """)
  Optional<KitchenTicketItem> lockByIdAndTicket(
      @Param("id") UUID id, @Param("ticketId") UUID ticketId, @Param("establishmentId") UUID establishmentId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select i from KitchenTicketItem i where i.ticketId = :ticketId order by i.createdAt asc, i.id asc")
  List<KitchenTicketItem> lockByTicketId(@Param("ticketId") UUID ticketId);
}
