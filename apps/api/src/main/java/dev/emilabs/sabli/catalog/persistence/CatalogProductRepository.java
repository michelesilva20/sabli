package dev.emilabs.sabli.catalog.persistence;

import dev.emilabs.sabli.catalog.domain.CatalogProduct;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface CatalogProductRepository
    extends JpaRepository<CatalogProduct, UUID>, JpaSpecificationExecutor<CatalogProduct> {

  Optional<CatalogProduct> findByIdAndEstablishmentId(UUID id, UUID establishmentId);

  boolean existsByEstablishmentIdAndSlug(UUID establishmentId, String slug);

  boolean existsByEstablishmentIdAndSlugAndIdNot(UUID establishmentId, String slug, UUID id);
}
