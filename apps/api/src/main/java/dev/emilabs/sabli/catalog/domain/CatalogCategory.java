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
@Table(name = "catalog_categories")
public class CatalogCategory {

  @Id
  private UUID id;

  @Column(name = "establishment_id", nullable = false)
  private UUID establishmentId;

  @Column(name = "organization_id", nullable = false)
  private UUID organizationId;

  @Column(nullable = false)
  private String name;

  @Column(nullable = false)
  private String slug;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private CatalogStatus status;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public static CatalogCategory create(
      UUID establishmentId, UUID organizationId, String name, String slug, int sortOrder) {
    CatalogCategory category = new CatalogCategory();
    category.id = UUID.randomUUID();
    category.establishmentId = establishmentId;
    category.organizationId = organizationId;
    category.name = name;
    category.slug = slug;
    category.sortOrder = sortOrder;
    category.status = CatalogStatus.ACTIVE;
    return category;
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

  public String name() {
    return name;
  }

  public String slug() {
    return slug;
  }

  public int sortOrder() {
    return sortOrder;
  }

  public CatalogStatus status() {
    return status;
  }

  public boolean isActive() {
    return status == CatalogStatus.ACTIVE;
  }

  public void rename(String name, String slug, int sortOrder) {
    this.name = name;
    this.slug = slug;
    this.sortOrder = sortOrder;
  }

  public void changeStatus(CatalogStatus status) {
    this.status = status;
  }
}
