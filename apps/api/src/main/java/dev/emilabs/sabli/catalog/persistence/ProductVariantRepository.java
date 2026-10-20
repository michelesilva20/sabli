package dev.emilabs.sabli.catalog.persistence;

import dev.emilabs.sabli.catalog.domain.ProductVariant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, UUID> {

  List<ProductVariant> findByProductIdOrderBySortOrderAscNameAscIdAsc(UUID productId);

  List<ProductVariant> findByProductIdIn(List<UUID> productIds);

  Optional<ProductVariant> findByIdAndEstablishmentId(UUID id, UUID establishmentId);

  boolean existsByProductIdAndName(UUID productId, String name);

  boolean existsByProductIdAndNameAndIdNot(UUID productId, String name, UUID id);
}
