package dev.emilabs.sabli.catalog.application;

import dev.emilabs.sabli.catalog.domain.CatalogCategory;
import dev.emilabs.sabli.catalog.domain.CatalogProduct;
import dev.emilabs.sabli.catalog.domain.CatalogStatus;
import dev.emilabs.sabli.catalog.domain.ProductVariant;
import dev.emilabs.sabli.catalog.persistence.CatalogCategoryRepository;
import dev.emilabs.sabli.catalog.persistence.CatalogProductRepository;
import dev.emilabs.sabli.catalog.persistence.ProductVariantRepository;
import dev.emilabs.sabli.identity.domain.Establishment;
import dev.emilabs.sabli.shared.error.ApiException;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class CatalogQueryService {

  private static final Sort PRODUCT_SORT = Sort.by("sortOrder", "name", "id");

  private final CatalogAccess access;
  private final CatalogCategoryRepository categories;
  private final CatalogProductRepository products;
  private final ProductVariantRepository variants;

  public CatalogQueryService(
      CatalogAccess access,
      CatalogCategoryRepository categories,
      CatalogProductRepository products,
      ProductVariantRepository variants) {
    this.access = access;
    this.categories = categories;
    this.products = products;
    this.variants = variants;
  }

  @Transactional(readOnly = true)
  public List<CatalogCategory> listCategories(UUID userId, UUID establishmentId, boolean includeInactive) {
    access.requireRead(userId, establishmentId);
    if (includeInactive) {
      return categories.findByEstablishmentIdOrderBySortOrderAscNameAscIdAsc(establishmentId);
    }
    return categories.findByEstablishmentIdAndStatusOrderBySortOrderAscNameAscIdAsc(
        establishmentId, CatalogStatus.ACTIVE);
  }

  @Transactional(readOnly = true)
  public Page<CatalogProduct> listProducts(UUID userId, UUID establishmentId, ProductFilter filter) {
    access.requireRead(userId, establishmentId);
    Specification<CatalogProduct> spec =
        (root, query, cb) -> {
          List<Predicate> predicates = new ArrayList<>();
          predicates.add(cb.equal(root.get("establishmentId"), establishmentId));
          if (!filter.includeInactive()) {
            predicates.add(cb.equal(root.get("status"), CatalogStatus.ACTIVE));
          }
          if (filter.available() != null) {
            predicates.add(cb.equal(root.get("available"), filter.available()));
          }
          if (filter.categoryId() != null) {
            predicates.add(cb.equal(root.get("categoryId"), filter.categoryId()));
          }
          if (StringUtils.hasText(filter.query())) {
            predicates.add(
                cb.like(cb.lower(root.get("name")), "%" + filter.query().toLowerCase(Locale.ROOT).trim() + "%"));
          }
          return cb.and(predicates.toArray(Predicate[]::new));
        };
    int page = Math.max(filter.page(), 0);
    int size = Math.min(Math.max(filter.size(), 1), 100);
    return products.findAll(spec, PageRequest.of(page, size, PRODUCT_SORT));
  }

  @Transactional(readOnly = true)
  public CatalogProduct getProduct(UUID userId, UUID establishmentId, UUID productId) {
    access.requireRead(userId, establishmentId);
    return products.findByIdAndEstablishmentId(productId, establishmentId).orElseThrow(ApiException::notFound);
  }

  @Transactional(readOnly = true)
  public List<ProductVariant> variantsFor(UUID productId) {
    return variants.findByProductIdOrderBySortOrderAscNameAscIdAsc(productId);
  }

  @Transactional(readOnly = true)
  public Map<UUID, List<ProductVariant>> variantsByProduct(List<UUID> productIds) {
    if (productIds.isEmpty()) {
      return Map.of();
    }
    return variants.findByProductIdIn(productIds).stream().collect(Collectors.groupingBy(ProductVariant::productId));
  }

  public Establishment requireRead(UUID userId, UUID establishmentId) {
    return access.requireRead(userId, establishmentId);
  }

  public record ProductFilter(
      UUID categoryId, Boolean available, String query, boolean includeInactive, int page, int size) {}
}
