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
@Table(name = "pizza_extras")
public class PizzaExtra {

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

  public static PizzaExtra create(
      UUID establishmentId, UUID organizationId, String name, String slug, int priceCents, int sortOrder) {
    PizzaExtra extra = new PizzaExtra();
    extra.id = UUID.randomUUID();
    extra.establishmentId = establishmentId;
    extra.organizationId = organizationId;
    extra.name = name;
    extra.slug = slug;
    extra.priceCents = priceCents;
    extra.available = true;
    extra.status = CatalogStatus.ACTIVE;
    extra.sortOrder = sortOrder;
    return extra;
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

  public boolean isUsable() {
    return status == CatalogStatus.ACTIVE && available;
  }

  public void update(String name, String slug, int priceCents, boolean available, int sortOrder) {
    this.name = name;
    this.slug = slug;
    this.priceCents = priceCents;
    this.available = available;
    this.sortOrder = sortOrder;
  }

  public void changeStatus(CatalogStatus status) {
    this.status = status;
  }
}
