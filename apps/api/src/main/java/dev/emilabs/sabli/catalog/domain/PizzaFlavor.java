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
@Table(name = "pizza_flavors")
public class PizzaFlavor {

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

  @Column(nullable = false)
  private String description;

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

  public static PizzaFlavor create(
      UUID establishmentId,
      UUID organizationId,
      String name,
      String slug,
      String description,
      int sortOrder) {
    PizzaFlavor flavor = new PizzaFlavor();
    flavor.id = UUID.randomUUID();
    flavor.establishmentId = establishmentId;
    flavor.organizationId = organizationId;
    flavor.name = name;
    flavor.slug = slug;
    flavor.description = description;
    flavor.available = true;
    flavor.status = CatalogStatus.ACTIVE;
    flavor.sortOrder = sortOrder;
    return flavor;
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

  public String name() {
    return name;
  }

  public String slug() {
    return slug;
  }

  public String description() {
    return description;
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

  public boolean isUsable() {
    return status == CatalogStatus.ACTIVE && available;
  }

  public void update(String name, String slug, String description, boolean available, int sortOrder) {
    this.name = name;
    this.slug = slug;
    this.description = description;
    this.available = available;
    this.sortOrder = sortOrder;
  }

  public void changeStatus(CatalogStatus status) {
    this.status = status;
  }
}
