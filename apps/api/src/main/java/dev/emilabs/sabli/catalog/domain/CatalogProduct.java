package dev.emilabs.sabli.catalog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "catalog_products")
public class CatalogProduct {

  @Id
  private UUID id;

  @Column(name = "establishment_id", nullable = false)
  private UUID establishmentId;

  @Column(name = "organization_id", nullable = false)
  private UUID organizationId;

  @Column(name = "category_id", nullable = false)
  private UUID categoryId;

  @Column(nullable = false)
  private String name;

  @Column(nullable = false)
  private String slug;

  @Column(nullable = false)
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ProductKind kind;

  @Column(nullable = false)
  private boolean available;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private CatalogStatus status;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  @Version
  @Column(nullable = false)
  private int version;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public static CatalogProduct create(
      UUID establishmentId,
      UUID organizationId,
      UUID categoryId,
      String name,
      String slug,
      String description,
      ProductKind kind,
      boolean available,
      int sortOrder) {
    CatalogProduct product = new CatalogProduct();
    product.id = UUID.randomUUID();
    product.establishmentId = establishmentId;
    product.organizationId = organizationId;
    product.categoryId = categoryId;
    product.name = name;
    product.slug = slug;
    product.description = description;
    product.kind = kind;
    product.available = available;
    product.status = CatalogStatus.ACTIVE;
    product.sortOrder = sortOrder;
    return product;
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

  public UUID establishmentId() {
    return establishmentId;
  }

  public UUID organizationId() {
    return organizationId;
  }

  public UUID categoryId() {
    return categoryId;
  }

  public String name() {
    return name;
  }

  public String slug() {
    return slug;
  }

  public String description() {
    return description;
  }

  public ProductKind kind() {
    return kind;
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

  public int version() {
    return version;
  }

  public boolean isActive() {
    return status == CatalogStatus.ACTIVE;
  }

  public void update(
      UUID categoryId, String name, String slug, String description, ProductKind kind, int sortOrder) {
    this.categoryId = categoryId;
    this.name = name;
    this.slug = slug;
    this.description = description;
    this.kind = kind;
    this.sortOrder = sortOrder;
  }

  public void changeAvailability(boolean available) {
    this.available = available;
  }

  public void changeStatus(CatalogStatus status) {
    this.status = status;
  }
}
