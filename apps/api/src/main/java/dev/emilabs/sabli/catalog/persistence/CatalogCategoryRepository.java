package dev.emilabs.sabli.catalog.persistence;

import dev.emilabs.sabli.catalog.domain.CatalogCategory;
import dev.emilabs.sabli.catalog.domain.CatalogStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CatalogCategoryRepository extends JpaRepository<CatalogCategory, UUID> {

  List<CatalogCategory> findByEstablishmentIdOrderBySortOrderAscNameAscIdAsc(UUID establishmentId);

  List<CatalogCategory> findByEstablishmentIdAndStatusOrderBySortOrderAscNameAscIdAsc(
      UUID establishmentId, CatalogStatus status);

  Optional<CatalogCategory> findByIdAndEstablishmentId(UUID id, UUID establishmentId);

  boolean existsByEstablishmentIdAndSlug(UUID establishmentId, String slug);

  boolean existsByEstablishmentIdAndSlugAndIdNot(UUID establishmentId, String slug, UUID id);
}
