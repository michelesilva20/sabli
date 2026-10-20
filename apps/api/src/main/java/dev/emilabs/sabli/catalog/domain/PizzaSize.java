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
@Table(name = "pizza_sizes")
public class PizzaSize {

  @Id
  private UUID id;

  @Column(name = "establishment_id", nullable = false)
  private UUID establishmentId;

  @Column(name = "organization_id", nullable = false)
  private UUID organizationId;

  @Column(nullable = false)
  private String code;

  @Column(nullable = false)
  private String name;

  @Column(name = "max_flavors", nullable = false)
  private int maxFlavors;

  @Column(nullable = false)
  private int slices;

  @Column(name = "price_factor_numerator", nullable = false)
  private int priceFactorNumerator;

  @Column(name = "price_factor_denominator", nullable = false)
  private int priceFactorDenominator;

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

  public static PizzaSize create(
      UUID establishmentId,
      UUID organizationId,
      String code,
      String name,
      int maxFlavors,
      int slices,
      int priceFactorNumerator,
      int priceFactorDenominator,
      int sortOrder) {
    PizzaSize size = new PizzaSize();
    size.id = UUID.randomUUID();
    size.establishmentId = establishmentId;
    size.organizationId = organizationId;
    size.code = code;
    size.name = name;
    size.maxFlavors = maxFlavors;
    size.slices = slices;
    size.priceFactorNumerator = priceFactorNumerator;
    size.priceFactorDenominator = priceFactorDenominator;
    size.available = true;
    size.status = CatalogStatus.ACTIVE;
    size.sortOrder = sortOrder;
    return size;
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

  public String code() {
    return code;
  }

  public String name() {
    return name;
  }

  public int maxFlavors() {
    return maxFlavors;
  }

  public int slices() {
    return slices;
  }

  public int priceFactorNumerator() {
    return priceFactorNumerator;
  }

  public int priceFactorDenominator() {
    return priceFactorDenominator;
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

  public void update(
      String name,
      int maxFlavors,
      int slices,
      int priceFactorNumerator,
      int priceFactorDenominator,
      boolean available,
      int sortOrder) {
    this.name = name;
    this.maxFlavors = maxFlavors;
    this.slices = slices;
    this.priceFactorNumerator = priceFactorNumerator;
    this.priceFactorDenominator = priceFactorDenominator;
    this.available = available;
    this.sortOrder = sortOrder;
  }

  public void changeStatus(CatalogStatus status) {
    this.status = status;
  }
}
