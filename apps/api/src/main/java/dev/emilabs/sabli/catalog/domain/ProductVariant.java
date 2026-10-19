package dev.emilabs.sabli.catalog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "catalog_product_variants")
public class ProductVariant {

  @Id
  private UUID id;

  @Column(name = "product_id", nullable = false)
  private UUID productId;

  @Column(name = "establishment_id", nullable = false)
  private UUID establishmentId;

  @Column(name = "organization_id", nullable = false)
  private UUID organizationId;

  @Column(nullable = false)
  private String name;

  @Column(name = "price_cents", nullable = false)
  private int priceCents;

  @Column(nullable = false)
  private boolean available;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private CatalogStatus status;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public static ProductVariant create(
      UUID productId,
      UUID establishmentId,
      UUID organizationId,
      String name,
      int priceCents,
      boolean available,
      int sortOrder) {
    ProductVariant variant = new ProductVariant();
    variant.id = UUID.randomUUID();
    variant.productId = productId;
    variant.establishmentId = establishmentId;
    variant.organizationId = organizationId;
    variant.name = name;
    variant.priceCents = priceCents;
    variant.available = available;
    variant.status = CatalogStatus.ACTIVE;
    variant.sortOrder = sortOrder;
    return variant;
  }

  @PrePersist
  void onCreate() {
    Instant now = Instant.now();
    createdAt = now;
    updatedAt = now;
  }

  @PreUpdate
  void onUpdate() {
    updatedAt = Instant.now();
  }

  public UUID id() {
    return id;
  }

  public UUID productId() {
    return productId;
  }

  public UUID establishmentId() {
    return establishmentId;
  }

  public String name() {
    return name;
  }

  public int priceCents() {
    return priceCents;
  }

  public boolean available() {
    return available;
  }

  public CatalogStatus status() {
    return status;
  }

  public int sortOrder() {
    return sortOrder;
  }

  public boolean isActive() {
    return status == CatalogStatus.ACTIVE;
  }

  public void update(String name, int priceCents, boolean available, int sortOrder) {
    this.name = name;
    this.priceCents = priceCents;
    this.available = available;
    this.sortOrder = sortOrder;
  }

  public void changeStatus(CatalogStatus status) {
    this.status = status;
  }
}
