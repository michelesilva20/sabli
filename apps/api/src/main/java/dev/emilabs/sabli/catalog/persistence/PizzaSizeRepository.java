package dev.emilabs.sabli.catalog.persistence;

import dev.emilabs.sabli.catalog.domain.PizzaSize;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PizzaSizeRepository extends JpaRepository<PizzaSize, UUID> {

  List<PizzaSize> findByEstablishmentIdOrderBySortOrderAscNameAscIdAsc(UUID establishmentId);

  Optional<PizzaSize> findByIdAndEstablishmentId(UUID id, UUID establishmentId);

  boolean existsByEstablishmentIdAndCode(UUID establishmentId, String code);
}
