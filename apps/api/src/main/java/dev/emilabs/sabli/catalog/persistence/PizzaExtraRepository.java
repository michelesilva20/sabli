package dev.emilabs.sabli.catalog.persistence;

import dev.emilabs.sabli.catalog.domain.PizzaExtra;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PizzaExtraRepository extends JpaRepository<PizzaExtra, UUID> {

  List<PizzaExtra> findByEstablishmentIdOrderBySortOrderAscNameAscIdAsc(UUID establishmentId);

  Optional<PizzaExtra> findByIdAndEstablishmentId(UUID id, UUID establishmentId);

  boolean existsByEstablishmentIdAndSlug(UUID establishmentId, String slug);

  boolean existsByEstablishmentIdAndSlugAndIdNot(UUID establishmentId, String slug, UUID id);
}
