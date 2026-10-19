package dev.emilabs.sabli.catalog.persistence;

import dev.emilabs.sabli.catalog.domain.PizzaCrust;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PizzaCrustRepository extends JpaRepository<PizzaCrust, UUID> {

  List<PizzaCrust> findByEstablishmentIdOrderBySortOrderAscNameAscIdAsc(UUID establishmentId);

  Optional<PizzaCrust> findByIdAndEstablishmentId(UUID id, UUID establishmentId);

  boolean existsByEstablishmentIdAndSlug(UUID establishmentId, String slug);

  boolean existsByEstablishmentIdAndSlugAndIdNot(UUID establishmentId, String slug, UUID id);
}
