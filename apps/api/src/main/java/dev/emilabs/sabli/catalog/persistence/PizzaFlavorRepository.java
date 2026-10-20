package dev.emilabs.sabli.catalog.persistence;

import dev.emilabs.sabli.catalog.domain.PizzaFlavor;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PizzaFlavorRepository extends JpaRepository<PizzaFlavor, UUID> {

  List<PizzaFlavor> findByEstablishmentIdOrderBySortOrderAscNameAscIdAsc(UUID establishmentId);

  Optional<PizzaFlavor> findByIdAndEstablishmentId(UUID id, UUID establishmentId);

  boolean existsByEstablishmentIdAndSlug(UUID establishmentId, String slug);

  boolean existsByEstablishmentIdAndSlugAndIdNot(UUID establishmentId, String slug, UUID id);
}
